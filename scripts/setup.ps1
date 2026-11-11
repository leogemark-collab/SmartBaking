param([switch]$SkipBuild)

. (Join-Path $PSScriptRoot 'common.ps1')

Enable-ProjectNode -InstallIfMissing
foreach ($command in @('php', 'composer', 'uv')) { Assert-CommandAvailable -Name $command }

$webDirectory = Join-Path $script:ProjectRoot 'apps\web'
$forecastDirectory = Join-Path $script:ProjectRoot 'services\forecasting'
$webEnvironment = Join-Path $webDirectory '.env'
$forecastEnvironment = Join-Path $forecastDirectory '.env'

foreach ($environmentPath in @($webEnvironment, $forecastEnvironment)) {
    if (-not (Test-Path -LiteralPath $environmentPath)) {
        $examplePath = $environmentPath + '.example'
        if (-not (Test-Path -LiteralPath $examplePath)) { throw "Missing environment template: $examplePath" }
        Copy-Item -LiteralPath $examplePath -Destination $environmentPath
    }
}

Sync-ForecastApiKey -WebEnvironment $webEnvironment -ForecastEnvironment $forecastEnvironment

Write-Host 'Installing Laravel dependencies from composer.lock...'
Invoke-Checked -Command 'composer' -Arguments @('install', '--no-interaction', '--prefer-dist') -WorkingDirectory $webDirectory
if (-not (Get-DotEnvValue -Path $webEnvironment -Name 'APP_KEY')) {
    Invoke-Checked -Command 'php' -Arguments @('artisan', 'key:generate', '--no-interaction') -WorkingDirectory $webDirectory
}

# Existing databases are preserved: migrations only apply changes that have not run.
$databaseConnection = Get-DotEnvValue -Path $webEnvironment -Name 'DB_CONNECTION'
if (-not $databaseConnection -or $databaseConnection -eq 'sqlite') {
    $databaseName = Get-DotEnvValue -Path $webEnvironment -Name 'DB_DATABASE'
    if (-not $databaseName) { $databaseName = 'database/database.sqlite' }
    if ($databaseName -ne ':memory:') {
        $databasePath = $databaseName
        if (-not [IO.Path]::IsPathRooted($databasePath)) { $databasePath = Join-Path $webDirectory $databasePath }
        if (-not (Test-Path -LiteralPath $databasePath)) {
            $databaseParent = Split-Path -Parent $databasePath
            if (-not (Test-Path -LiteralPath $databaseParent)) { New-Item -ItemType Directory -Path $databaseParent | Out-Null }
            New-Item -ItemType File -Path $databasePath | Out-Null
        }
    }
}
Invoke-Checked -Command 'php' -Arguments @('artisan', 'config:clear', '--no-interaction') -WorkingDirectory $webDirectory
Invoke-Checked -Command 'php' -Arguments @('artisan', 'migrate', '--no-interaction') -WorkingDirectory $webDirectory
Invoke-Checked -Command 'php' -Arguments @('artisan', 'db:seed', '--class=RolesSeeder', '--no-interaction') -WorkingDirectory $webDirectory

foreach ($packageDirectory in @($script:ProjectRoot, $webDirectory)) {
    $installCommand = 'install'
    if (Test-Path -LiteralPath (Join-Path $packageDirectory 'package-lock.json')) { $installCommand = 'ci' }
    Write-Host "Installing Node.js dependencies in $packageDirectory..."
    Invoke-Checked -Command 'npm.cmd' -Arguments @($installCommand, '--no-audit', '--no-fund') -WorkingDirectory $packageDirectory
}

Write-Host 'Installing the locked Python environment...'
Invoke-Checked -Command 'uv' -Arguments @('sync', '--locked') -WorkingDirectory $forecastDirectory
if (-not $SkipBuild) {
    Invoke-Checked -Command 'npm.cmd' -Arguments @('run', 'build') -WorkingDirectory $webDirectory
}

Write-Host ''
Write-Host 'Setup complete. Start all services with:'
Write-Host '  powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1'
