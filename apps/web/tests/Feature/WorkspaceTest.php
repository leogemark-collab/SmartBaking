<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class WorkspaceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
    }

    #[DataProvider('screens')]
    public function test_staff_screens_require_authentication(string $screen): void
    {
        $this->get(route($screen))->assertRedirect(route('login'));
    }

    #[DataProvider('screens')]
    public function test_staff_screens_require_a_verified_email(string $screen): void
    {
        $this->actingAs(User::factory()->unverified()->create())
            ->get(route($screen))
            ->assertRedirect(route('verification.notice'));
    }

    #[DataProvider('screens')]
    public function test_verified_staff_can_open_each_workspace_screen(string $screen): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route($screen))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('operations/workspace')
                ->where('screen', $screen)
                ->where('mode', 'live')
                ->where('preview', false)
                ->has('auth.user.id')
            );
    }

    public function test_preview_home_is_public_and_shows_the_sample_dashboard(): void
    {
        $this->get(route('preview'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('workspace/dashboard')
                ->where('preview', true)
                ->where('auth.user', null)
            );
    }

    #[DataProvider('screens')]
    public function test_whitelisted_preview_screens_are_public(string $screen): void
    {
        $this->get(route('preview.screen', ['screen' => $screen]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('workspace/'.$screen)
                ->where('preview', true)
                ->where('auth.user', null)
            );
    }

    #[DataProvider('invalidScreens')]
    public function test_preview_cannot_render_arbitrary_components(string $screen): void
    {
        $this->get('/preview/'.$screen)->assertNotFound();
    }

    public function test_public_preview_does_not_expose_credentials_or_staff_records(): void
    {
        config([
            'smartbaking.forecasting.api_key' => 'forecast-secret-not-for-browser',
            'mail.mailers.smtp.password' => 'smtp-secret-not-for-browser',
        ]);
        User::factory()->create([
            'name' => 'Private Staff Record',
            'email' => 'private-staff@example.com',
        ]);

        $this->get(route('preview'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('preview', true)
                ->where('auth.user', null)
            )
            ->assertDontSee('forecast-secret-not-for-browser', false)
            ->assertDontSee('smtp-secret-not-for-browser', false)
            ->assertDontSee('Private Staff Record', false)
            ->assertDontSee('private-staff@example.com', false);
    }

    public function test_preview_query_cannot_bypass_staff_authentication(): void
    {
        $this->get(route('inventory', ['preview' => true]))
            ->assertRedirect(route('login'));
    }

    public function test_preview_query_does_not_change_the_staff_page_mode(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('inventory', ['preview' => true]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('operations/workspace')
                ->where('screen', 'inventory')
                ->where('mode', 'live')
                ->where('preview', false)
            );
    }

    /** @return array<string, array{string}> */
    public static function screens(): array
    {
        return [
            'dashboard' => ['dashboard'],
            'pos' => ['pos'],
            'production' => ['production'],
            'inventory' => ['inventory'],
            'forecasts' => ['forecasts'],
            'transfers' => ['transfers'],
            'team' => ['team'],
            'reports' => ['reports'],
        ];
    }

    /** @return array<string, array{string}> */
    public static function invalidScreens(): array
    {
        return [
            'settings' => ['settings'],
            'unknown' => ['unknown'],
            'nested component' => ['auth/login'],
            'extra path' => ['dashboard/extra'],
            'dot segment' => ['..'],
            'traversal' => ['../settings'],
            'encoded traversal' => ['%2e%2e%2fsettings'],
        ];
    }
}
