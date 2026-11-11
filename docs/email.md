# Verification email delivery

The initial local environment uses `MAIL_MAILER=log`. Laravel generates verification messages but writes them to `apps/web/storage/logs/laravel.log`; the log driver does not deliver them to a real inbox. Do not share that log: it can contain email addresses and signed verification links.

## Gmail setup

1. Turn on 2-Step Verification for the Google account that will send SmartBaking messages.
2. Create a dedicated App Password at [Google App Passwords](https://myaccount.google.com/apppasswords). Availability depends on account policies. Use this generated password rather than your normal Google sign-in password.
3. Run this from the repository root in your own terminal:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-gmail.ps1
```

The script prompts for the sender address and masks the App Password input. It checks a TLS-protected SMTP connection and authentication before writing settings. It does not send a message. If the connection fails, the existing `.env` remains unchanged. The local `.env` is ignored by Git; never paste its contents into chat or a ticket.

After successful setup, return to `http://localhost:8000`, sign in, and click **Resend verification email**. Check the inbox and spam folder for the registered account. Open the verification link in the same browser session. Use the same hostname throughout: `localhost` and `127.0.0.1` have separate browser cookies.

App Passwords require 2-Step Verification and may be unavailable for managed accounts or accounts with certain security policies. If unavailable, use an SMTP provider or Google-supported OAuth integration appropriate for the account.

## Manual SMTP configuration

These are the equivalent Gmail settings in `apps/web/.env`. Replace placeholder values privately on your machine before enabling SMTP:

```dotenv
MAIL_MAILER=smtp
MAIL_SCHEME=smtp
MAIL_URL=null
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-sender@gmail.com
MAIL_PASSWORD=your-google-app-password
MAIL_FROM_ADDRESS=your-sender@gmail.com
MAIL_FROM_NAME="SmartBaking"
```

Laravel 13's current mail configuration reads `MAIL_SCHEME`; `smtp` with port 587 uses STARTTLS when negotiated. Do not use `tls` as the scheme. The Gmail setup checker requires TLS and keeps certificate verification enabled.

For another SMTP provider, use its host, port, authentication credentials, and authorized sender address. Do not switch to SMTP with empty credentials and expect inbox delivery.

After manual edits:

```powershell
php .\apps\web\artisan config:clear
php .\apps\web\artisan mail:check
```

`mail:check` checks the selected transport and, for SMTP, opens and authenticates the connection without submitting an email. A successful SMTP check confirms connectivity/authentication, not guaranteed inbox placement. This application's built-in verification notification sends synchronously, so a queue worker is not required for it.

## References

- [Laravel mail and local log transport](https://laravel.com/framework/docs/mail)
- [Laravel email verification](https://laravel.com/framework/docs/verification)
- [Google App Password requirements](https://support.google.com/mail/answer/185833?hl=en)
- [Gmail SMTP hosts, ports, and TLS](https://developers.google.com/workspace/gmail/imap/imap-smtp)
