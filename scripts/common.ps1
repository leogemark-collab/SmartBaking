Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:ProjectRoot = Split-Path -Parent $PSScriptRoot

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [string[]]$Arguments = @(),
        [string]$WorkingDirectory = $script:ProjectRoot
    )

    Push-Location -LiteralPath $WorkingDirectory
    try {
        $global:LASTEXITCODE = 0
        & $Command @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "$Command failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}

function Enable-ProjectNode {
    param([switch]$InstallIfMissing)

    $nodeDirectory = Join-Path $script:ProjectRoot '.tools\node'
    $nodeExecutable = Join-Path $nodeDirectory 'node.exe'
    if (-not (Test-Path -LiteralPath $nodeExecutable)) {
        if (-not $InstallIfMissing) {
            throw 'Project Node.js is missing. Run powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1 first.'
        }
        & (Join-Path $PSScriptRoot 'install-node.ps1')
        if (-not (Test-Path -LiteralPath $nodeExecutable)) {
            throw 'Node.js installation did not produce .tools\node\node.exe.'
        }
    }

    $env:PATH = $nodeDirectory + [IO.Path]::PathSeparator + $env:PATH
    $majorVersion = [int]((& $nodeExecutable --version).TrimStart('v').Split('.')[0])
    if ($majorVersion -ne 24) {
        throw 'This project requires the portable Node.js 24 LTS runtime in .tools\node.'
    }
}

function Assert-CommandAvailable {
    param([Parameter(Mandatory = $true)][string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name is not available on PATH. See docs/development.md for prerequisites."
    }
}

function Get-DotEnvValue {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Name
    )

    if (-not (Test-Path -LiteralPath $Path)) { return '' }
    $entries = @(Get-Content -LiteralPath $Path | Where-Object { $_ -match ('^\s*' + [regex]::Escape($Name) + '\s*=') })
    if ($entries.Count -gt 1) {
        throw "Duplicate $Name entries found in $Path. Keep one value and rerun setup."
    }
    if ($entries.Count -eq 0) { return '' }
    $value = ($entries[0] -replace ('^\s*' + [regex]::Escape($Name) + '\s*=\s*'), '').Trim()
    if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
        return $value.Substring(1, $value.Length - 2)
    }
    return ($value -replace '\s+#.*$', '').Trim()
}

function Set-DotEnvValue {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Value
    )

    $content = [IO.File]::ReadAllText($Path)
    $pattern = '(?m)^\s*' + [regex]::Escape($Name) + '\s*=.*$'
    if ([regex]::IsMatch($content, $pattern)) {
        $replacement = $Name + '=' + $Value
        $content = [regex]::Replace($content, $pattern, [Text.RegularExpressions.MatchEvaluator]{ param($match) $replacement })
    }
    else {
        $content = $content.TrimEnd("`r", "`n") + "`r`n" + $Name + '=' + $Value + "`r`n"
    }
    [IO.File]::WriteAllText($Path, $content, (New-Object Text.UTF8Encoding($false)))
}

function Sync-ForecastApiKey {
    param(
        [Parameter(Mandatory = $true)][string]$WebEnvironment,
        [Parameter(Mandatory = $true)][string]$ForecastEnvironment
    )

    $webKey = Get-DotEnvValue -Path $WebEnvironment -Name 'FORECAST_API_KEY'
    $forecastKey = Get-DotEnvValue -Path $ForecastEnvironment -Name 'FORECAST_API_KEY'
    if ($webKey -and $forecastKey -and $webKey -cne $forecastKey) {
        throw 'FORECAST_API_KEY differs between apps/web/.env and services/forecasting/.env. Set the same private key in both files and rerun setup. Existing keys were preserved.'
    }

    $sharedKey = $webKey
    if (-not $sharedKey) { $sharedKey = $forecastKey }
    if (-not $sharedKey) {
        $randomBytes = New-Object byte[] 32
        $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
        try { $generator.GetBytes($randomBytes) }
        finally { $generator.Dispose() }
        $sharedKey = [Convert]::ToBase64String($randomBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
    }
    if (-not $webKey) { Set-DotEnvValue -Path $WebEnvironment -Name 'FORECAST_API_KEY' -Value $sharedKey }
    if (-not $forecastKey) { Set-DotEnvValue -Path $ForecastEnvironment -Name 'FORECAST_API_KEY' -Value $sharedKey }
    Write-Host 'Forecast API credentials are configured in both local environment files.'
}
