<?php

namespace App\Jobs;

use App\Services\Auth\PatientSmsGateway;
use App\Services\WebPushService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Throwable;

/** Delivers one dose reminder over one channel; status QUEUED → SENT | FAILED | SKIPPED. Retries with backoff. */
class SendDoseReminder implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public array $backoff = [30, 90];

    public function __construct(public string $deliveryId) {}

    public function handle(WebPushService $push, PatientSmsGateway $sms): void
    {
        $delivery = DB::table('reminder_deliveries')->find($this->deliveryId);
        if (! $delivery || in_array($delivery->status, ['SENT', 'SKIPPED'], true)) return;
        DB::table('reminder_deliveries')->where('id', $delivery->id)->increment('attempts');
        $event = DB::table('dose_events as e')->join('medication_courses as c', 'c.id', '=', 'e.medication_course_id')
            ->join('prescription_items as i', 'i.id', '=', 'c.prescription_item_id')->join('prescriptions as p', 'p.id', '=', 'i.prescription_id')
            ->where('e.id', $delivery->dose_event_id)->select('e.id', 'e.status', 'e.scheduled_at', 'c.status as course_status', 'p.status as rx_status', 'p.superseded_at', 'p.cancelled_at', 'i.generic_name', 'i.strength', 'i.dose')->first();
        // Obsolete reminders (dose already answered, course stopped, prescription amended/cancelled) are not sent.
        if (! $event || $event->status !== 'SCHEDULED' || $event->course_status !== 'ACTIVE' || $event->rx_status !== 'SIGNED' || $event->superseded_at || $event->cancelled_at) {
            $this->mark('SKIPPED', 'Dose no longer pending'); return;
        }
        $title = $delivery->kind === 'FOLLOW_UP' ? 'Did you take your medicine?' : 'Time for your medicine';
        $body = trim("{$event->generic_name} {$event->strength} — {$event->dose}");
        if ($delivery->channel === 'PUSH') {
            $subs = DB::table('push_subscriptions')->where('user_id', $delivery->user_id)->get();
            if ($subs->isEmpty()) { $this->mark('SKIPPED', 'No push subscription'); return; }
            $ok = false; $lastError = null;
            foreach ($subs as $sub) {
                try {
                    $status = $push->send($sub, ['title' => $title, 'body' => $body, 'dose_event_id' => $event->id, 'scheduled_at' => $event->scheduled_at, 'kind' => $delivery->kind, 'url' => '/patient-login#dashboard-alarm']);
                    if (in_array($status, [404, 410], true)) DB::table('push_subscriptions')->where('id', $sub->id)->delete();
                    elseif ($status >= 200 && $status < 300) { $ok = true; DB::table('push_subscriptions')->where('id', $sub->id)->update(['last_success_at' => now()]); }
                    else $lastError = "Push service HTTP $status";
                } catch (Throwable $e) { $lastError = substr($e->getMessage(), 0, 250); }
            }
            if ($ok) { $this->mark('SENT'); return; }
            $this->mark('FAILED', $lastError ?? 'All subscriptions expired');
            if ($lastError) $this->release($this->backoff[min($this->attempts() - 1, 1)] ?? 60);
            return;
        }
        if ($delivery->channel === 'SMS') {
            $phone = DB::table('users')->where('id', $delivery->user_id)->value('phone_number');
            if (! $phone || ! PatientSmsGateway::configured()) { $this->mark('SKIPPED', 'SMS not configured or phone unverified'); return; }
            $sms->sendText($phone, "MedMinders: {$title}. {$body}. Open the app to record it.");
            $this->mark('SENT');
        }
    }

    private function mark(string $status, ?string $error = null): void
    {
        DB::table('reminder_deliveries')->where('id', $this->deliveryId)->update(['status' => $status, 'error' => $error,
            'sent_at' => $status === 'SENT' ? now() : null, 'updated_at' => now()]);
    }

    public function failed(Throwable $e): void { $this->mark('FAILED', substr($e->getMessage(), 0, 250)); }
}
