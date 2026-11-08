<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use App\Services\DrugInteractionProvider;
use App\Services\UnavailableDrugInteractionProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(DrugInteractionProvider::class, UnavailableDrugInteractionProvider::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Schema::defaultStringLength(191);
        if (app()->environment('production') && config('mfa.mock_enabled')) {
            throw new RuntimeException('SEC-INV-004: development mock MFA is forbidden in production.');
        }
    }
}
