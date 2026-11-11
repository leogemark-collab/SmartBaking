. (Join-Path $PSScriptRoot 'common.ps1')

Enable-ProjectNode
foreach ($command in @('php', 'uv')) { Assert-CommandAvailable -Name $command }
$webDirectory = Join-Path $script:ProjectRoot 'apps\web'
$forecastDirectory = Join-Path $script:ProjectRoot 'services\forecasting'

Write-Host 'Building the production frontend...'
Invoke-Checked -Command 'npm.cmd' -Arguments @('run', 'build') -WorkingDirectory $webDirectory
Write-Host 'Checking TypeScript...'
Invoke-Checked -Command 'npm.cmd' -Arguments @('run', 'types:check') -WorkingDirectory $webDirectory
Write-Host 'Running Laravel tests...'
Invoke-Checked -Command 'php' -Arguments @('artisan', 'test') -WorkingDirectory $webDirectory
Write-Host 'Running forecasting tests...'
Invoke-Checked -Command 'uv' -Arguments @('run', '--locked', 'pytest') -WorkingDirectory $forecastDirectory
Write-Host 'Running forecasting smoke checks...'
Invoke-Checked -Command 'uv' -Arguments @('run', '--locked', 'smartbaking-forecasting-smoke') -WorkingDirectory $forecastDirectory
Write-Host 'All development checks passed.'
