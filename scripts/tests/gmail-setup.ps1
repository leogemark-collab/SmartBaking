# Exercise the setup flow with synthetic credentials and a fake PHP executable.
# No network requests or email messages are made by this test.
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$taskFixtureRoot = Join-Path $taskRoot ('.tools\gmail-setup-test-' + [Guid]::NewGuid().ToString('N'))
$taskSavedPath = $env:PATH

function Read-Host {
    param([string]$Prompt, [switch]$AsSecureString)
    if ($AsSecureString) { return ConvertTo-SecureString 'abcdefghijklmnop' -AsPlainText -Force }
    return 'sender@example.test'
}

try {
    foreach ($taskScenario in @('success', 'failure')) {
        $taskCaseRoot = Join-Path $taskFixtureRoot $taskScenario
        $taskScripts = Join-Path $taskCaseRoot 'scripts'
        $taskWeb = Join-Path $taskCaseRoot 'apps\web'
        $taskFakeBin = Join-Path $taskCaseRoot 'bin'
        New-Item -ItemType Directory -Force -Path $taskScripts,$taskWeb,$taskFakeBin | Out-Null
        foreach ($taskScript in @('common.ps1', 'setup-gmail.ps1')) {
            Copy-Item -LiteralPath (Join-Path $taskRoot ('scripts\' + $taskScript)) -Destination $taskScripts
        }
        $taskEnvFile = Join-Path $taskWeb '.env'
        $taskOriginal = "APP_KEY=synthetic-app-key`nFORECAST_API_KEY=synthetic-service-key`nMAIL_MAILER=log`nMAIL_HOST=127.0.0.1`nMAIL_URL=smtp://old.example.test`n"
        [IO.File]::WriteAllText($taskEnvFile, $taskOriginal, (New-Object Text.UTF8Encoding($false)))
        $taskFakePhp = "@echo off`r`nexit /b 0`r`n"
        if ($taskScenario -eq 'failure') {
            $taskFakePhp = "@echo off`r`nif `"%2`"==`"mail:check`" exit /b 1`r`nexit /b 0`r`n"
        }
        [IO.File]::WriteAllText((Join-Path $taskFakeBin 'php.cmd'), $taskFakePhp, [Text.Encoding]::ASCII)
        $env:PATH = $taskFakeBin + [IO.Path]::PathSeparator + $taskSavedPath
        $taskBeforeMailer = [Environment]::GetEnvironmentVariable('MAIL_MAILER', 'Process')
        $taskBeforePassword = [Environment]::GetEnvironmentVariable('MAIL_PASSWORD', 'Process')
        $taskFailed = $false
        try { & (Join-Path $taskScripts 'setup-gmail.ps1') }
        catch { $taskFailed = $true }

        if ([Environment]::GetEnvironmentVariable('MAIL_MAILER', 'Process') -cne $taskBeforeMailer -or
            [Environment]::GetEnvironmentVariable('MAIL_PASSWORD', 'Process') -cne $taskBeforePassword) {
            throw 'Gmail setup did not restore process-local configuration.'
        }
        $taskResult = [IO.File]::ReadAllText($taskEnvFile)
        if ($taskScenario -eq 'failure') {
            if (-not $taskFailed -or $taskResult -cne $taskOriginal) {
                throw 'Failed SMTP authentication must leave the existing environment unchanged.'
            }
        }
        else {
            if ($taskFailed -or $taskResult -notmatch '(?m)^MAIL_MAILER=smtp\r?$' -or
                $taskResult -notmatch '(?m)^MAIL_HOST=smtp.gmail.com\r?$' -or
                $taskResult -notmatch '(?m)^MAIL_URL=null\r?$' -or
                $taskResult -notmatch '(?m)^APP_KEY=synthetic-app-key\r?$' -or
                $taskResult -notmatch '(?m)^FORECAST_API_KEY=synthetic-service-key\r?$') {
                throw 'Successful Gmail setup must save SMTP settings and preserve application keys.'
            }
        }
        Write-Host "Gmail setup $taskScenario scenario passed."
    }
}
finally { $env:PATH = $taskSavedPath }
