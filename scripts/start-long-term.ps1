param(
  [switch]$RegisterTask
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$cloudflared = "C:\Users\34818\.codex\bin\cloudflared.exe"
$tunnelId = "47d7ad0d-753b-4d45-9d1f-60a3b314f3e6"
$logDir = Join-Path $root ".cloudflare-tunnel"

if (-not (Test-Path $cloudflared)) {
  throw "cloudflared not found: $cloudflared"
}

if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$portListening = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if (-not $portListening) {
  Start-Process -FilePath "node" `
    -ArgumentList "server.js" `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir "server.stdout.log") `
    -RedirectStandardError (Join-Path $logDir "server.stderr.log")
}

$tunnelRunning = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
if (-not $tunnelRunning) {
  Start-Process -FilePath $cloudflared `
    -ArgumentList @(
      "tunnel",
      "--config",
      (Join-Path $root ".cloudflare-tunnel\wulv.yml"),
      "run",
      $tunnelId
    ) `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir "wulv.stdout.log") `
    -RedirectStandardError (Join-Path $logDir "wulv.stderr.log")
}

if ($RegisterTask) {
  try {
    $action = New-ScheduledTaskAction `
      -Execute "powershell.exe" `
      -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PSCommandPath`""
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $settings = New-ScheduledTaskSettingsSet `
      -StartWhenAvailable `
      -RestartCount 3 `
      -RestartInterval (New-TimeSpan -Minutes 1) `
      -ExecutionTimeLimit ([TimeSpan]::Zero)
    Register-ScheduledTask `
      -TaskName "PhysicsAdventureLongTerm" `
      -Action $action `
      -Trigger $trigger `
      -Settings $settings `
      -Force | Out-Null
  } catch {
    $startup = [Environment]::GetFolderPath("Startup")
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut("$startup\PhysicsAdventureLongTerm.lnk")
    $shortcut.TargetPath = "powershell.exe"
    $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PSCommandPath`""
    $shortcut.WorkingDirectory = $root
    $shortcut.Save()
  }
}

Write-Output "Physics Adventure local service and Cloudflare named tunnel are configured."
