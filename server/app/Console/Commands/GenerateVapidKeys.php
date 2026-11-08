<?php

namespace App\Console\Commands;

use App\Services\WebPushService;
use Illuminate\Console\Command;

class GenerateVapidKeys extends Command
{
    protected $signature = 'push:vapid-keys {--write : Write the keys into server/.env (local file, never committed)}';
    protected $description = 'Generate a VAPID key pair for web push reminders';

    public function handle(): int
    {
        $pair = WebPushService::generateKeyPair();
        $public = WebPushService::b64u($pair['public']);
        $private = base64_encode($pair['private_pem']);
        if (! $this->option('write')) {
            $this->line("VAPID_PUBLIC_KEY=$public");
            $this->warn('Re-run with --write to store both keys in server/.env (the private key is not printed).');
            return self::SUCCESS;
        }
        $env = base_path('.env');
        $content = file_exists($env) ? file_get_contents($env) : '';
        foreach (['VAPID_PUBLIC_KEY' => $public, 'VAPID_PRIVATE_KEY' => $private] as $key => $value) {
            $content = preg_match("/^$key=.*$/m", $content) ? preg_replace("/^$key=.*$/m", "$key=$value", $content) : rtrim($content)."\n$key=$value\n";
        }
        file_put_contents($env, $content);
        $this->info('VAPID keys written to server/.env. Restart artisan serve / queue:work. Existing browser subscriptions must re-subscribe.');
        return self::SUCCESS;
    }
}
