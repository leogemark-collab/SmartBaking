[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskTools = Join-Path $taskRoot '.tools'
$taskNodeDir = Join-Path $taskTools 'node'
$taskNodeExe = Join-Path $taskNodeDir 'node.exe'

if (Test-Path -LiteralPath $taskNodeExe) {
    $taskVersion = & $taskNodeExe --version
    if ($LASTEXITCODE -eq 0 -and $taskVersion -match '^v24\.') {
        Write-Host "Project-local Node $taskVersion is ready."
        return
    }
    throw 'An unexpected runtime exists in .tools/node. Inspect it before installing another version.'
}

if ($env:OS -ne 'Windows_NT') {
    throw 'This helper installs Node for Windows. On other systems install Node 24 LTS using your normal package manager.'
}
if ($env:PROCESSOR_ARCHITECTURE -ne 'AMD64') {
    throw 'This helper currently supports Windows x64 only.'
}

[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
New-Item -ItemType Directory -Force -Path $taskTools | Out-Null
$taskReleases = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json'
$taskRelease = $taskReleases | Where-Object { $_.version -like 'v24.*' -and $_.lts } | Select-Object -First 1
if (-not $taskRelease) { throw 'No Node 24 LTS release was found in the official release index.' }
$taskArchiveName = "node-$($taskRelease.version)-win-x64.zip"
$taskBaseUri = "https://nodejs.org/dist/$($taskRelease.version)"
$taskArchive = Join-Path $taskTools $taskArchiveName
$taskExpandedName = [IO.Path]::GetFileNameWithoutExtension($taskArchiveName)
$taskExpanded = Join-Path $taskTools $taskExpandedName
if (Test-Path -LiteralPath $taskExpanded) {
    throw "A previous extraction exists at $taskExpanded. Inspect it before retrying."
}

Write-Host "Downloading Node $($taskRelease.version) from nodejs.org..."
$taskChecksums = (Invoke-WebRequest -UseBasicParsing -Uri "$taskBaseUri/SHASUMS256.txt").Content
$taskPattern = '(?m)^([a-fA-F0-9]{64})\s+' + [regex]::Escape($taskArchiveName) + '\s*$'
$taskMatch = [regex]::Match($taskChecksums, $taskPattern)
if (-not $taskMatch.Success) { throw 'The official checksum for the Node archive was not found.' }
Invoke-WebRequest -UseBasicParsing -Uri "$taskBaseUri/$taskArchiveName" -OutFile $taskArchive
$taskActualHash = (Get-FileHash -LiteralPath $taskArchive -Algorithm SHA256).Hash
if ($taskActualHash -ne $taskMatch.Groups[1].Value) {
    throw 'Node archive SHA-256 verification failed. The archive has not been extracted.'
}
Expand-Archive -LiteralPath $taskArchive -DestinationPath $taskTools
# Both paths are fixed children of this project's .tools directory.
$taskResolvedTools = [IO.Path]::GetFullPath($taskTools) + [IO.Path]::DirectorySeparatorChar
foreach ($taskTarget in @($taskExpanded, $taskNodeDir)) {
    if (-not [IO.Path]::GetFullPath($taskTarget).StartsWith($taskResolvedTools, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'The Node installation path is outside the project tools directory.'
    }
}
Move-Item -LiteralPath $taskExpanded -Destination $taskNodeDir
Remove-Item -LiteralPath $taskArchive
Write-Host "Installed project-local Node $(& $taskNodeExe --version). Your global Node installation is unchanged."
