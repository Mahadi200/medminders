<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\SampleData;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class SampleDataTest extends TestCase
{
    use DatabaseTransactions;

    public function test_sample_seed_is_idempotent_and_purge_removes_only_sample_rows(): void
    {
        $real = User::create(['name' => 'Real person', 'email' => 'real-'.Str::ulid().'@example.test', 'password' => 'long-test-password']);
        (new SampleData())->run();
        $doctors = DB::table('clinician_credentials')->where('is_sample', true)->count();
        (new SampleData())->run();
        $this->assertSame($doctors, DB::table('clinician_credentials')->where('is_sample', true)->count());
        $this->assertGreaterThanOrEqual(12, $doctors);
        $this->assertSame(10, DB::table('patient_records')->where('is_sample', true)->where('name', 'like', 'Sample %')->count());
        $this->artisan('sample:purge', ['--force' => true])->assertSuccessful();
        $this->assertSame(0, DB::table('users')->where('is_sample', true)->count());
        $this->assertSame(0, DB::table('organizations')->where('is_sample', true)->count());
        $this->assertDatabaseHas('users', ['id' => $real->id]);
    }
}
