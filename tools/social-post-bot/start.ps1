param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$url = 'http://127.0.0.1:4567'
$nodeExe = 'C:\laragon\bin\nodejs\node-v24\node.exe'
function Test-BotReady {
    try {
        $status = Invoke-RestMethod "$url/status" -TimeoutSec 2
        return $null -ne $status.PSObject.Properties['aiAvailable']
    } catch { return $false }
}
try {
    if (!(Test-BotReady)) {
        if (!(Test-Path -LiteralPath $nodeExe)) { throw 'Node.js is missing.' }
        $logDir = Join-Path $PSScriptRoot '..\..\logs'
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
        $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
        $outLog = Join-Path $logDir "social-$stamp.log"
        $errLog = Join-Path $logDir "social-$stamp-error.log"
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
            throw "Could not start the social bot. See $errLog"
        }
    }
    if (!$NoBrowser) { Start-Process $url }
    Write-Host "Social bot ready: $url"
    exit 0
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
