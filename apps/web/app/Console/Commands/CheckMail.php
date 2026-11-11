<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Transport\Smtp\EsmtpTransport;
use Symfony\Component\Mailer\Transport\Smtp\Stream\SocketStream;
use Throwable;

class CheckMail extends Command
{
    protected $signature = 'mail:check';

    protected $description = 'Check SMTP configuration and connectivity without sending an email';

    public function handle(): int
    {
        $mailer = config('mail.default');

        if (! is_string($mailer) || ! preg_match('/\A[a-zA-Z0-9_-]+\z/', $mailer)) {
            $this->error('Select a configured SMTP mailer before running this check.');

            return self::FAILURE;
        }

        $this->line('Selected mailer: '.$mailer);
        $configuration = config('mail.mailers.'.$mailer);
        $driver = is_array($configuration) ? ($configuration['transport'] ?? null) : null;

        if (in_array($driver, ['log', 'array'], true)) {
            $this->error('This mailer stores messages locally and does not deliver email to an inbox. Configure SMTP to send real email.');

            return self::FAILURE;
        }

        if ($driver !== 'smtp') {
            $this->error('This diagnostic supports SMTP mailers only. Select a configured SMTP mailer.');

            return self::FAILURE;
        }

        $from = config('mail.mailers.'.$mailer.'.from.address', config('mail.from.address'));

        if (! is_string($from) || ! filter_var($from, FILTER_VALIDATE_EMAIL)) {
            $this->error('Configure a valid mail From address before checking SMTP.');

            return self::FAILURE;
        }

        try {
            // Resolving the transport also honors credentials/host supplied through MAIL_URL.
            $transport = Mail::mailer($mailer)->getSymfonyTransport();

            if (! $transport instanceof EsmtpTransport) {
                $this->error('The configured mailer does not use a supported ESMTP transport.');

                return self::FAILURE;
            }

            $stream = $transport->getStream();

            if (! $stream instanceof SocketStream) {
                $this->error('The configured SMTP transport does not use a supported network socket.');

                return self::FAILURE;
            }

            $host = trim($stream->getHost(), '[]');

            if ((! filter_var($host, FILTER_VALIDATE_IP)
                && ! filter_var($host, FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME))
                || $stream->getPort() < 1 || $stream->getPort() > 65535) {
                $this->error('Configure a valid SMTP host and port before checking the connection.');

                return self::FAILURE;
            }

            if (! $this->isLoopback($host)) {
                if (trim($transport->getUsername()) === '' || trim($transport->getPassword()) === '') {
                    $this->error('Remote SMTP requires a configured username and password. No connection was attempted.');

                    return self::FAILURE;
                }

                // Keep implicit SMTPS, or require STARTTLS before authentication on SMTP.
                $transport->setAutoTls(true);
                $transport->setRequireTls(true);
                $options = $stream->getStreamOptions();
                $options['ssl']['verify_peer'] = true;
                $options['ssl']['verify_peer_name'] = true;
                $options['ssl']['allow_self_signed'] = false;
                $stream->setStreamOptions($options);
            }

            $stream->setTimeout(min(10.0, max(1.0, $stream->getTimeout())));

            try {
                // start() performs SMTP greeting, TLS negotiation, and configured authentication.
                // No message, sender, recipient, or DATA command is submitted.
                $transport->start();
            } finally {
                $transport->stop();
            }

            $this->info('SMTP connection check passed. No email was sent.');
            $this->line('Inbox delivery and sender authorization have not been tested.');

            return self::SUCCESS;
        } catch (Throwable) {
            // Transport exceptions can contain credentials, server responses, or addresses.
            $this->error('SMTP connection check failed. Verify the host, port, TLS settings, credentials, and network access. No email was sent.');

            return self::FAILURE;
        }
    }

    private function isLoopback(string $host): bool
    {
        return strtolower(rtrim($host, '.')) === 'localhost'
            || $host === '::1'
            || (filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) && str_starts_with($host, '127.'));
    }
}
