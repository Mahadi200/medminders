<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Concerns\HasUlids;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUlids, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'email',
        'phone_number',
        'password',
        'is_active',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_active' => 'boolean',
        'password' => 'hashed',
    ];

    public function roles() { return $this->hasMany(Role::class); }
    public function clinicianCredential() { return $this->hasOne(ClinicianCredential::class); }
    public function pharmacistCredential() { return $this->hasOne(PharmacistCredential::class); }
    public function patientPrescriptions() { return $this->hasMany(Prescription::class, 'patient_id'); }
    public function doctorPrescriptions() { return $this->hasMany(Prescription::class, 'doctor_id'); }

    public function hasRole(string $role): bool
    {
        return $this->roles()->where('role', $role)->exists();
    }

    public function isVerifiedClinician(): bool
    {
        return ($this->hasRole('DOCTOR') && $this->clinicianCredential?->verification_status === 'VERIFIED')
            || ($this->hasRole('PHARMACIST') && $this->pharmacistCredential?->verification_status === 'VERIFIED')
            || $this->hasRole('HOSPITAL_ADMIN') || $this->hasRole('SUPERADMIN');
    }
}
