<?php

namespace App\Console\Commands;

use App\Jobs\SendDoseReminder;
use App\Services\Auth\PatientSmsGateway;
use App\Services\CareNotificationService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Runs every minute (schedule:work). For every pending antibiotic dose:
 *  - at the scheduled time: in-app reminder + queued push (or SMS fallback when the patient has no push subscription);
 *  - 30 minutes later, if still unconfirmed: one follow-up reminder;
 *  - 60 minutes later, if still unconfirmed: recorded as MISSED (no confirmation received). The patient can still correct it.
 * Antibiotic dose reminders ignore quiet hours and cannot be switched off while a course is active.
 * Reminders for doses whose course/prescription changed are cancelled.
 */
class PrepareDoseNotifications extends Command
{
    public const FOLLOW_UP_MINUTES = 30;
    public const MISSED_AFTER_MINUTES = 60;

    protected $signature = 'care:prepare-dose-notifications';
    protected $description = 'Queue antibiotic dose reminders, follow-ups and missed-dose recording';

    public function handle(CareNotificationService $notifications): int
    {
        $events = DB::table('dose_events as e')->join('medication_courses as c', 'c.id', '=', 'e.medication_course_id')
            ->join('prescription_items as i', 'i.id', '=', 'c.prescription_item_id')->join('prescriptions as p', 'p.id', '=', 'i.prescription_id')
            ->where('e.scheduled_at', '<=', now())->where('e.scheduled_at', '>=', now()->subDay())
            ->where('e.status', 'SCHEDULED')->where('c.status', 'ACTIVE')->where('p.status', 'SIGNED')->whereNull('p.superseded_at')->whereNull('p.cancelled_at')
            ->select('e.id', 'e.scheduled_at', 'c.patient_record_id', 'i.generic_name', 'i.dose')->orderBy('e.scheduled_at')->limit(2000)->get();
        $queued = 0; $missed = 0;
        foreach ($events as $event) {
            $age = CarbonImmutable::parse($event->scheduled_at, 'UTC')->diffInMinutes(now());
            $users = DB::table('patient_links')->where('patient_record_id', $event->patient_record_id)->pluck('user_id');
            if ($age >= self::MISSED_AFTER_MINUTES) {
                DB::table('dose_events')->where('id', $event->id)->where('status', 'SCHEDULED')->update(['status' => 'MISSED', 'updated_at' => now()]);
                foreach ($users as $userId) $notifications->create($userId, 'DOSE_MISSED', 'REMINDER', 'NORMAL', 'DOSE_EVENT', $event->id, '/patient-login#dashboard-courses',
                    ['message' => "No confirmation was received for your {$event->generic_name} dose. If you took it, record it now. Do not double the next dose."], 'DOSE_MISSED:'.$event->id, $event->scheduled_at, $event->id);
                $missed++;
                continue;
            }
            $kinds = ['DUE'];
            if ($age >= self::FOLLOW_UP_MINUTES) $kinds[] = 'FOLLOW_UP';
            foreach ($users as $userId) {
                $notifications->create($userId, 'DOSE_REMINDER', 'REMINDER', 'HIGH', 'DOSE_EVENT', $event->id, '/patient-login#dashboard-alarm',
                    ['message' => "Time for {$event->generic_name} ({$event->dose})."], 'DOSE_REMINDER:'.$event->id, $event->scheduled_at, $event->id);
                $hasPush = DB::table('push_subscriptions')->where('user_id', $userId)->exists();
                $channel = $hasPush ? 'PUSH' : (PatientSmsGateway::configured() ? 'SMS' : null);
                if (! $channel) continue;
                foreach ($kinds as $kind) $queued += $this->queue($event->id, $userId, $kind, $channel);
            }
        }
        // Cancel obsolete reminders after treatment changes.
        $cancelIds = DB::table('care_notifications as n')->join('dose_events as e', 'e.id', '=', 'n.dose_event_id')
            ->join('medication_courses as c', 'c.id', '=', 'e.medication_course_id')->join('prescription_items as i', 'i.id', '=', 'c.prescription_item_id')
            ->join('prescriptions as p', 'p.id', '=', 'i.prescription_id')->whereIn('n.event_type', ['DOSE_REMINDER', 'UNCONFIRMED_FOLLOWUP'])
            ->where(fn ($q) => $q->where('c.status', '!=', 'ACTIVE')->orWhereNotNull('p.superseded_at')->orWhereNotNull('p.cancelled_at')->orWhere('e.status', 'CANCELLED'))
            ->where('n.lifecycle_state', 'ACTIVE')->pluck('n.id');
        if ($cancelIds->isNotEmpty()) DB::table('care_notifications')->whereIn('id', $cancelIds)->update(['lifecycle_state' => 'CANCELLED', 'status' => 'CANCELLED', 'updated_at' => now()]);
        $this->info("Queued {$queued} reminder deliveries; recorded {$missed} doses as missed (no confirmation).");
        return self::SUCCESS;
    }

    /** Idempotent: one delivery per dose/user/kind/channel. Returns 1 when newly queued. */
    private function queue(string $eventId, string $userId, string $kind, string $channel): int
    {
        $id = (string) Str::ulid();
        $inserted = DB::table('reminder_deliveries')->insertOrIgnore(['id' => $id, 'dose_event_id' => $eventId, 'user_id' => $userId, 'kind' => $kind,
            'channel' => $channel, 'status' => 'QUEUED', 'created_at' => now(), 'updated_at' => now()]);
        if (! $inserted) return 0;
        SendDoseReminder::dispatch($id);
        return 1;
    }
}
