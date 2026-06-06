# Deploy Supabase Edge Functions for email notifications
# Prerequisites:
#   1. RESEND_API_KEY saved in Supabase Dashboard → Edge Functions → Secrets
#   2. Run once: supabase login
#      OR set: $env:SUPABASE_ACCESS_TOKEN = "sbp_your_token"
#      (token from https://supabase.com/dashboard/account/tokens)

$ErrorActionPreference = "Stop"
$ProjectRef = "knbbbrnwzbkywkrcponi"
$WorkDir = $PSScriptRoot
$Cli = Join-Path $env:TEMP "supabase-cli\supabase.exe"

if (-not (Test-Path $Cli)) {
  Write-Host "Downloading Supabase CLI..."
  $dir = Split-Path $Cli
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $tar = Join-Path $dir "supabase.tar.gz"
  Invoke-WebRequest -Uri "https://github.com/supabase/cli/releases/download/v2.105.0/supabase_2.105.0_windows_amd64.tar.gz" -OutFile $tar
  tar -xzf $tar -C $dir
}

if (-not $env:SUPABASE_ACCESS_TOKEN -and -not (Test-Path "$env:USERPROFILE\.supabase\access-token")) {
  Write-Host "Not logged in. Run: supabase login"
  Write-Host "Or set SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens"
  exit 1
}

Write-Host "Deploying notify-client-question..."
& $Cli functions deploy notify-client-question --project-ref $ProjectRef --workdir $WorkDir
Write-Host "Deploying notify-new-client..."
& $Cli functions deploy notify-new-client --project-ref $ProjectRef --workdir $WorkDir
Write-Host "Done."
