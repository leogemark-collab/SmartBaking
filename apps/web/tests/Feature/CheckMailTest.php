<?php

namespace Tests\Feature;

use Illuminate\Mail\Mailer;
use Illuminate\Support\Facades\Mail;
use Mockery;
use PHPUnit\Framework\MockObject\MockObject;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\Transport\Smtp\EsmtpTransport;
use Tests\TestCase;

class CheckMailTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.transport' => 'smtp',
            'mail.from.address' => 'sender@example.com',
        ]);
    }

    public function test_log_mailer_explains_that_it_cannot_deliver_to_an_inbox(): void
    {
        config(['mail.default' => 'log']);
        Mail::shouldReceive('mailer')->never();

        $this->artisan('mail:check')
            ->expectsOutput('Selected mailer: log')
            ->expectsOutputToContain('does not deliver email to an inbox')
            ->assertFailed();
    }

    public function test_array_mailer_cannot_be_reported_as_real_delivery(): void
    {
        config(['mail.default' => 'array']);
        Mail::shouldReceive('mailer')->never();

        $this->artisan('mail:check')->assertFailed();
    }

    public function test_missing_remote_credentials_fail_before_connecting(): void
    {
        $transport = $this->mockTransport();
        $transport->setUsername('');
        $transport->setPassword('');
        $transport->expects($this->never())->method('start');

        $this->artisan('mail:check')
            ->expectsOutputToContain('No connection was attempted')
            ->assertFailed();
    }

    public function test_success_checks_handshake_and_disconnects_without_sending_mail(): void
    {
        $transport = $this->mockTransport();
        $transport->expects($this->once())->method('start');
        $transport->expects($this->once())->method('stop');

        $this->artisan('mail:check')
            ->expectsOutputToContain('SMTP connection check passed. No email was sent.')
            ->assertSuccessful();

        $this->assertTrue($transport->isAutoTls());
        $this->assertTrue($transport->isTlsRequired());
    }

    public function test_implicit_smtps_is_preserved(): void
    {
        $transport = $this->mockTransport(port: 465, tls: true);
        $transport->expects($this->once())->method('start');
        $transport->expects($this->once())->method('stop');

        $this->artisan('mail:check')->assertSuccessful();

        $this->assertTrue($transport->getStream()->isTLS());
    }

    public function test_connection_or_authentication_errors_do_not_leak_exception_details(): void
    {
        $transport = $this->mockTransport();
        $transport->expects($this->once())->method('start')
            ->willThrowException(new TransportException('Authentication failed for private@example.com with private-password'));
        $transport->expects($this->once())->method('stop');

        $this->artisan('mail:check')
            ->expectsOutputToContain('SMTP connection check failed')
            ->doesntExpectOutputToContain('private@example.com')
            ->doesntExpectOutputToContain('private-password')
            ->assertFailed();
    }

    public function test_invalid_from_address_fails_before_transport_resolution(): void
    {
        config(['mail.from.address' => 'invalid-address']);
        Mail::shouldReceive('mailer')->never();

        $this->artisan('mail:check')->assertFailed();
    }

    public function test_invalid_host_fails_before_connecting(): void
    {
        $transport = $this->mockTransport(host: 'https://invalid-host');
        $transport->expects($this->never())->method('start');

        $this->artisan('mail:check')->assertFailed();
    }

    public function test_loopback_capture_can_be_checked_without_credentials(): void
    {
        $transport = $this->mockTransport(host: '127.0.0.1');
        $transport->setUsername('');
        $transport->setPassword('');
        $transport->expects($this->once())->method('start');
        $transport->expects($this->once())->method('stop');

        $this->artisan('mail:check')->assertSuccessful();
    }

    /** @return EsmtpTransport&MockObject */
    private function mockTransport(string $host = 'smtp.example.com', int $port = 587, bool $tls = false): EsmtpTransport
    {
        $transport = $this->getMockBuilder(EsmtpTransport::class)
            ->setConstructorArgs([$host, $port, $tls])
            ->onlyMethods(['start', 'stop', 'send', '__destruct'])
            ->getMock();
        $transport->setUsername('private@example.com');
        $transport->setPassword('private-password');
        $transport->expects($this->never())->method('send');

        $mailer = Mockery::mock(Mailer::class);
        $mailer->shouldReceive('getSymfonyTransport')->once()->andReturn($transport);
        Mail::shouldReceive('mailer')->with('smtp')->once()->andReturn($mailer);

        return $transport;
    }
}
