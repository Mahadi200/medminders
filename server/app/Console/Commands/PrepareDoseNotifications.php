<?php

namespace App\Console\Commands;

use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Services\CareNotificationService;

class PrepareDoseNotifications extends Command
{
    protected $signature = 'care:prepare-dose-notifications';
    protected $description = 'Make opted-in, generic dose reminders available in patient dashboards';

    public function handle(CareNotificationService $notifications): int
    {
        $events = DB::table('dose_events as e')->join('medication_courses as c', 'c.id', '=', 'e.medication_course_id')
            ->join('prescription_items as i', 'i.id', '=', 'c.prescription_item_id')
            ->join('prescriptions as p', 'p.id', '=', 'i.prescription_id')
            ->where('e.scheduled_at', '<=', now())->where('e.scheduled_at', '>=', now()->subDay())
            ->where('e.status', 'SCHEDULED')->where('c.status', 'ACTIVE')->where('p.status', 'SIGNED')
            ->whereNull('p.superseded_at')->whereNull('p.cancelled_at')
            ->select('e.id', 'e.scheduled_at', 'c.patient_record_id')->orderBy('e.scheduled_at')->limit(1000)->get();
        $count = 0;
        foreach ($events as $event) {
            $recipients = DB::table('patient_links as l')->join('notification_preferences as p', 'p.user_id', '=', 'l.user_id')
                ->where('l.patient_record_id', $event->patient_record_id)
                ->where(fn ($q) => $q->where('p.in_app_dose_reminders', true)->orWhere('p.in_app_followups', true))
                ->select('l.user_id', 'p.in_app_dose_reminders', 'p.in_app_followups', 'p.timezone', 'p.quiet_from', 'p.quiet_until')->get();
            foreach ($recipients as $recipient) {
                if ($this->quietNow($recipient)) continue;
                if ($recipient->in_app_dose_reminders) {
                    $notifications->create($recipient->user_id, 'DOSE_REMINDER', 'REMINDER', 'NORMAL', 'DOSE_EVENT', $event->id, '/dashboard#medication-courses', ['message' => 'A planned medication dose is due. Check your prescription instructions.'], 'DOSE_REMINDER:'.$event->id, $event->scheduled_at, $event->id);
                    $count++;
                }
                $unconfirmed = ! DB::table('dose_logs')->where('dose_event_id', $event->id)->exists();
                if ($recipient->in_app_followups && $unconfirmed && CarbonImmutable::parse($event->scheduled_at)->addHours(2)->lessThanOrEqualTo(now())) {
                    $notifications->create($recipient->user_id, 'UNCONFIRMED_FOLLOWUP', 'REMINDER', 'NORMAL', 'DOSE_EVENT', $event->id, '/dashboard#medication-courses', ['message' => 'This planned dose is still unconfirmed. No response is not proof of a missed dose.'], 'UNCONFIRMED_FOLLOWUP:'.$event->id, $event->scheduled_at, $event->id);
                    $count++;
                }
            }
        }
        $cancelIds = DB::table('care_notifications as n')->join('dose_events as e', 'e.id', '=', 'n.dose_event_id')
            ->join('medication_courses as c', 'c.id', '=', 'e.medication_course_id')
            ->join('prescription_items as i', 'i.id', '=', 'c.prescription_item_id')
            ->join('prescriptions as p', 'p.id', '=', 'i.prescription_id')
            ->whereIn('n.event_type', ['DOSE_REMINDER', 'UNCONFIRMED_FOLLOWUP'])
            ->where(function ($q) { $q->where('c.status', '!=', 'ACTIVE')->orWhereNotNull('p.superseded_at')->orWhereNotNull('p.cancelled_at'); })
            ->where('n.lifecycle_state', 'ACTIVE')->pluck('n.id');
        if ($cancelIds->isNotEmpty()) DB::table('care_notifications')->whereIn('id', $cancelIds)->update(['lifecycle_state' => 'CANCELLED', 'status' => 'CANCELLED', 'updated_at' => now()]);
        $this->info("Made {$count} in-app notifications available.");
        return self::SUCCESS;
    }

    private function quietNow(object $recipient): bool
    {
        if (! $recipient->quiet_from || ! $recipient->quiet_until) return false;
        $local = now()->setTimezone($recipient->timezone)->format('H:i:s');
        return $recipient->quiet_from <= $recipient->quiet_until
            ? $local >= $recipient->quiet_from && $local < $recipient->quiet_until
            : $local >= $recipient->quiet_from || $local < $recipient->quiet_until;
    }

}
