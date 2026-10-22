param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'

# Port from config.json or RAQEEM_SOCIAL_BOT_PORT (default 4567).
$port = 4567
try { $port = [int](Get-Content (Join-Path $PSScriptRoot 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json).port } catch { }
if ($env:RAQEEM_SOCIAL_BOT_PORT) { $port = [int]$env:RAQEEM_SOCIAL_BOT_PORT }
$url = "http://127.0.0.1:$port"

# Node: usual Laragon path, otherwise whatever is on PATH.
$nodeExe = 'C:\laragon\bin\nodejs\node-v24\node.exe'
if (!(Test-Path -LiteralPath $nodeExe)) {
    $found = Get-Command node -ErrorAction SilentlyContinue
    if ($found) { $nodeExe = $found.Source }
}

function Test-BotReady {
    try {
        $status = Invoke-RestMethod "$url/status" -TimeoutSec 2
        return $null -ne $status.PSObject.Properties['aiAvailable']
    } catch { return $false }
}

function Get-BotVersion {
    try { return (Invoke-RestMethod "$url/status" -TimeoutSec 2).version } catch { return $null }
}

try {
    # An instance from before the upgrade has no version in /status: stop it so the new code runs.
    if ((Test-BotReady) -and -not (Get-BotVersion)) {
        $owner = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($owner) {
            Write-Host 'Restarting the older social bot instance with the new version...'
            Stop-Process -Id $owner.OwningProcess -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
        }
    }
    if (!(Test-BotReady)) {
        if (!(Test-Path -LiteralPath $nodeExe)) { throw 'Node.js is missing.' }

        # Preflight: shows exactly what is missing instead of a vague startup failure.
        $check = & $nodeExe (Join-Path $PSScriptRoot 'check.cjs') --quiet 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) { throw "Preflight check failed:`n$check" }

        $logDir = Join-Path $PSScriptRoot '..\..\logs'
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
        # One stdout/stderr pair that is replaced on each start (no pile of empty files).
        # The real application log is social.log (it rotates automatically).
        $outLog = Join-Path $logDir 'social-stdout.log'
        $errLog = Join-Path $logDir 'social-stderr.log'
        $process = Start-Process -FilePath $nodeExe -ArgumentList 'server.cjs' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru
        $ready = $false
        for ($i = 0; $i -lt 40; $i++) {
            if (Test-BotReady) { $ready = $true; break }
            $process.Refresh()
            if ($process.HasExited) { break }
            Start-Sleep -Milliseconds 250
        }
        if (!$ready) {
            $process.Refresh()
            if (!$process.HasExited) { Stop-Process -Id $process.Id }
            $detail = (Get-Content $errLog -Tail 5 -ErrorAction SilentlyContinue) -join "`n"
            throw "Could not start the social bot. See $errLog`n$detail"
        }
    }
    if (!$NoBrowser -and $env:RAQEEM_BOT_NO_BROWSER -ne '1') { Start-Process $url }
    Write-Host "Social bot ready: $url"
    exit 0
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
