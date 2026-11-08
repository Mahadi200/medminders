<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Services\CareNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MessagingController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        return DB::table('care_conversations as c')->leftJoin('users as p', 'p.id', '=', 'c.patient_user_id')->leftJoin('users as d', 'd.id', '=', 'c.doctor_user_id')
            ->where(fn ($q) => $q->where('c.patient_user_id', $user->id)->orWhere('c.doctor_user_id', $user->id))
            ->select('c.id', 'c.patient_record_id', 'c.status', 'c.updated_at', 'p.name as patient_name', 'd.name as doctor_name')->orderByDesc('c.updated_at')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate(['patient_record_id' => 'required|ulid', 'doctor_id' => 'required|ulid']);
        $user = $request->user();
        $patientUser = DB::table('patient_links')->where('patient_record_id', $data['patient_record_id'])->where('relationship', 'SELF')->value('user_id');
        abort_unless($patientUser, 404);
        $doctorAuthorized = DB::table('prescriptions')->where('patient_record_id', $data['patient_record_id'])->where('doctor_id', $data['doctor_id'])->exists()
            || DB::table('sharing_grants')->where('patient_record_id', $data['patient_record_id'])->where('recipient_id', $data['doctor_id'])->where('expires_at', '>', now())->exists();
        $authorized = ($user->id === $patientUser && $user->hasRole('PATIENT') && $doctorAuthorized)
            || ($user->id === $data['doctor_id'] && $user->hasRole('DOCTOR') && DB::table('prescriptions')->where('patient_record_id', $data['patient_record_id'])->where('doctor_id', $user->id)->exists());
        abort_unless($authorized, 403);
        $existing = DB::table('care_conversations')->where(['patient_record_id' => $data['patient_record_id'], 'patient_user_id' => $patientUser, 'doctor_user_id' => $data['doctor_id']])->first();
        if ($existing) return response()->json($existing);
        $id = (string) Str::ulid();
        DB::table('care_conversations')->insert(['id' => $id, 'patient_record_id' => $data['patient_record_id'], 'patient_user_id' => $patientUser, 'doctor_user_id' => $data['doctor_id'], 'created_by' => $user->id, 'created_at' => now(), 'updated_at' => now()]);
        return response()->json(DB::table('care_conversations')->find($id), 201);
    }

    public function messages(Request $request, string $id)
    {
        $conversation = $this->conversation($request, $id);
        return DB::table('care_messages')->where('conversation_id', $conversation->id)->select('id', 'sender_id', 'body', 'attachment_path', 'sent_at', 'read_at')->orderBy('sent_at')->paginate(50);
    }

    public function send(Request $request, string $id, CareNotificationService $notifications)
    {
        $conversation = $this->conversation($request, $id);
        $data = $request->validate(['body' => 'required|string|max:5000', 'client_key' => 'nullable|string|max:191']);
        if (! empty($data['client_key'])) {
            $existing = DB::table('care_messages')->where(['conversation_id' => $id, 'client_key' => $data['client_key']])->first();
            if ($existing) return response()->json($existing);
        }
        $messageId = (string) Str::ulid();
        DB::table('care_messages')->insert(['id' => $messageId, 'conversation_id' => $id, 'sender_id' => $request->user()->id, 'body' => $data['body'], 'client_key' => $data['client_key'] ?? null, 'sent_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        $recipient = $conversation->patient_user_id === $request->user()->id ? $conversation->doctor_user_id : $conversation->patient_user_id;
        $notifications->create($recipient, 'NEW_MESSAGE', 'INFORMATION', 'NORMAL', 'CONVERSATION', $id, '/messages/'.$id, [], 'NEW_MESSAGE:'.$messageId);
        return response()->json(DB::table('care_messages')->find($messageId), 201);
    }

    private function conversation(Request $request, string $id): object
    {
        $conversation = DB::table('care_conversations')->find($id);
        abort_unless($conversation, 404);
        abort_unless(in_array($request->user()->id, [$conversation->patient_user_id, $conversation->doctor_user_id], true), 403);
        return $conversation;
    }
}
