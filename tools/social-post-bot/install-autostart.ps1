# Registers the social post bot to start automatically (hidden, no browser) at Windows logon,
# so scheduled posts keep publishing without opening anything.
#   Install: powershell -ExecutionPolicy Bypass -File install-autostart.ps1
#   Remove : powershell -ExecutionPolicy Bypass -File install-autostart.ps1 -Remove
param([switch]$Remove)
$name = 'Raqeem Social Post Bot'
if ($Remove) {
    Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Removed scheduled task '$name'."
    exit 0
}
$script = Join-Path $PSScriptRoot 'start.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`" -NoBrowser"
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Description 'Starts the Raqeem social post bot in the background at logon' -Force | Out-Null
Write-Host "Registered '$name': the bot now starts automatically at logon."
