<#
  Starts the MedMinders backend on this laptop in separate windows:
    1. Laravel API         (artisan serve on 127.0.0.1:8000)
    2. Scheduler           (artisan schedule:work  -> dose reminders every minute)
    3. Queue worker        (artisan queue:work     -> reminder/notification delivery jobs with retries)
    4. HTTPS tunnel        (ngrok static domain    -> lets https://medminders.vercel.app reach this API)

  Start XAMPP MySQL yourself first.

  Usage:
    .\start-backend.ps1 -NgrokDomain your-name.ngrok-free.app
    # or set it once:  [Environment]::SetEnvironmentVariable('MEDMINDERS_NGROK_DOMAIN','your-name.ngrok-free.app','User')
    .\start-backend.ps1
    .\start-backend.ps1 -NoTunnel      # local only
#>
param(
  [string]$NgrokDomain = $env:MEDMINDERS_NGROK_DOMAIN,
  [string]$Php = 'C:\xampp\php\php.exe',
  [switch]$NoTunnel
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$server = Join-Path $root 'server'
if (-not (Test-Path $Php)) { Write-Error "PHP not found at $Php. Pass -Php <path>."; exit 1 }

# Fail early if MySQL is not reachable (artisan would otherwise start but every request would fail).
$mysql = Test-NetConnection -ComputerName 127.0.0.1 -Port 3306 -WarningAction SilentlyContinue
if (-not $mysql.TcpTestSucceeded) { Write-Warning 'MySQL is not listening on 3306. Start it from the XAMPP Control Panel, then re-run this script.' }

function Start-Window([string]$title, [string]$command) {
  Start-Process powershell.exe -ArgumentList @('-NoExit', '-Command', "`$Host.UI.RawUI.WindowTitle = '$title'; Set-Location '$server'; $command") | Out-Null
  Write-Host "Started: $title"
}

& $Php (Join-Path $server 'artisan') migrate --force   # additive migrations only; never fresh/reset

Start-Window 'MedMinders API'       "& '$Php' artisan serve --host=127.0.0.1 --port=8000"
Start-Window 'MedMinders scheduler' "& '$Php' artisan schedule:work"
Start-Window 'MedMinders queue'     "& '$Php' artisan queue:work --tries=3 --backoff=30 --sleep=2"

if (-not $NoTunnel) {
  if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
    Write-Warning 'ngrok is not installed or not on PATH. Install from https://ngrok.com/download, then run: ngrok config add-authtoken <your-token>'
  } elseif (-not $NgrokDomain) {
    Write-Warning 'No ngrok domain given. Pass -NgrokDomain <name>.ngrok-free.app or set MEDMINDERS_NGROK_DOMAIN.'
  } else {
    Start-Window 'MedMinders tunnel' "ngrok http --url=$NgrokDomain 8000"
    Write-Host "API public URL: https://$NgrokDomain  (set this as VITE_API_URL in Vercel)"
  }
}
Write-Host 'Health check: http://127.0.0.1:8000/api/v1/health/ready'
