# Run this command in your own terminal. Credentials are never command-line arguments.
. (Join-Path $PSScriptRoot 'common.ps1')

Assert-CommandAvailable -Name 'php'
$taskWebDirectory = Join-Path $script:ProjectRoot 'apps\web'
$taskEnvironmentPath = Join-Path $taskWebDirectory '.env'
if (-not (Test-Path -LiteralPath $taskEnvironmentPath)) {
    throw 'Run scripts/setup.ps1 before configuring email.'
}
$taskOriginalFile = [IO.File]::ReadAllText($taskEnvironmentPath)

Write-Host 'Configure Gmail for real outgoing verification emails.'
Write-Host 'Create a Google App Password first: https://myaccount.google.com/apppasswords'
Write-Host 'This requires 2-Step Verification. Enter the App Password, not your Google sign-in password.'
$taskSender = (Read-Host 'Gmail sender email address').Trim()
try {
    $taskAddress = New-Object System.Net.Mail.MailAddress($taskSender)
    if ($taskAddress.Address -cne $taskSender) { throw 'Enter an email address without a display name.' }
}
catch {
    throw 'Enter a valid sender email address. No configuration was changed.'
}

$taskSecurePassword = Read-Host 'Google App Password (input is hidden)' -AsSecureString
$taskPasswordPointer = [IntPtr]::Zero
$taskPassword = $null
$taskOriginalProcessValues = @{}
$taskCandidateSettings = @{}
try {
    $taskPasswordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskSecurePassword)
    $taskPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskPasswordPointer) -replace '\s', ''
    if ($taskPassword -notmatch '^[A-Za-z0-9]{16}$') {
        throw 'A Google App Password has 16 letters/numbers; spaces are ignored. No configuration was changed.'
    }

    $taskCandidateSettings = @{
        MAIL_MAILER = 'smtp'
        MAIL_SCHEME = 'smtp'
        MAIL_URL = 'null'
        MAIL_HOST = 'smtp.gmail.com'
        MAIL_PORT = '587'
        MAIL_USERNAME = $taskSender
        MAIL_PASSWORD = $taskPassword
        MAIL_FROM_ADDRESS = $taskSender
        MAIL_FROM_NAME = 'SmartBaking'
    }

    # Child-process variables let the diagnostic check credentials before .env is changed.
    foreach ($taskName in $taskCandidateSettings.Keys) {
        $taskOriginalProcessValues[$taskName] = [Environment]::GetEnvironmentVariable($taskName, 'Process')
        [Environment]::SetEnvironmentVariable($taskName, $taskCandidateSettings[$taskName], 'Process')
    }
    Invoke-Checked -Command 'php' -Arguments @('artisan', 'config:clear') -WorkingDirectory $taskWebDirectory
    Invoke-Checked -Command 'php' -Arguments @('artisan', 'mail:check') -WorkingDirectory $taskWebDirectory

    if ([IO.File]::ReadAllText($taskEnvironmentPath) -cne $taskOriginalFile) {
        throw 'The environment file changed while SMTP was checked. Rerun this command to preserve the newer settings.'
    }

    # Keep the current delivery mode until all SMTP settings are complete.
    foreach ($taskName in $taskCandidateSettings.Keys) {
        if ($taskName -ne 'MAIL_MAILER') {
            $taskValue = $taskCandidateSettings[$taskName]
            if ($taskName -eq 'MAIL_URL') { $taskValue = 'null' }
            Set-DotEnvValue -Path $taskEnvironmentPath -Name $taskName -Value $taskValue
        }
    }
    Set-DotEnvValue -Path $taskEnvironmentPath -Name 'MAIL_MAILER' -Value 'smtp'

    Write-Host 'Gmail SMTP authenticated and the local configuration was saved.'
    Write-Host 'No email was sent by this setup. Return to SmartBaking and choose Resend verification email.'
    Write-Host 'Use http://localhost:8000 consistently so the email link opens in the same signed-in session.'
}
finally {
    foreach ($taskName in $taskOriginalProcessValues.Keys) {
        [Environment]::SetEnvironmentVariable($taskName, $taskOriginalProcessValues[$taskName], 'Process')
    }
    if ($taskPasswordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskPasswordPointer)
    }
    $taskSecurePassword.Dispose()
    $taskPassword = $null
    $taskCandidateSettings.Clear()
}
