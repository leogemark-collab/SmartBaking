. (Join-Path $PSScriptRoot 'common.ps1')

Enable-ProjectNode
foreach ($command in @('php', 'uv')) { Assert-CommandAvailable -Name $command }
foreach ($requiredPath in @('node_modules\concurrently', 'apps\web\vendor\autoload.php', 'apps\web\.env', 'services\forecasting\.env')) {
    if (-not (Test-Path -LiteralPath (Join-Path $script:ProjectRoot $requiredPath))) {
        throw "Missing $requiredPath. Run scripts/setup.ps1 first."
    }
}

Write-Host 'Laravel:  http://127.0.0.1:8000'
Write-Host 'Forecast: http://127.0.0.1:8001/health'
Write-Host 'Press Ctrl+C to stop all services.'
Invoke-Checked -Command 'npm.cmd' -Arguments @('run', 'dev:services')
