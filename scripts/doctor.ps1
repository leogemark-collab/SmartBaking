. (Join-Path $PSScriptRoot 'common.ps1')

$nodePath = Join-Path $script:ProjectRoot '.tools\node\node.exe'
if (Test-Path -LiteralPath $nodePath) {
    Enable-ProjectNode
    Write-Host 'Project Node.js:'
    Invoke-Checked -Command $nodePath -Arguments @('--version')
    Write-Host 'Project npm:'
    Invoke-Checked -Command 'npm.cmd' -Arguments @('--version')
}
else { Write-Host 'Project Node.js: missing (run setup.ps1)' }

foreach ($command in @('php', 'composer', 'uv')) {
    if (Get-Command $command -ErrorAction SilentlyContinue) {
        Write-Host ($command + ':')
        Invoke-Checked -Command $command -Arguments @('--version')
    }
    else { Write-Host ($command + ': missing') }
}

foreach ($relativePath in @('apps\web\vendor\autoload.php', 'apps\web\node_modules', 'node_modules\concurrently', 'services\forecasting\.venv', 'apps\web\.env', 'services\forecasting\.env')) {
    $state = 'missing'
    if (Test-Path -LiteralPath (Join-Path $script:ProjectRoot $relativePath)) { $state = 'present' }
    Write-Host ($relativePath + ': ' + $state)
}
Write-Host 'Environment values and API keys are intentionally not displayed.'
