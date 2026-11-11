<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RolesEnvironmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_role_setup_is_repeatable_without_creating_accounts(): void
    {
        $this->seed(RolesSeeder::class);
        $this->seed(RolesSeeder::class);

        $this->assertSame(5, Role::count());
        $this->assertSame(0, User::count());
    }

    public function test_role_assignment_is_explicit_for_each_account(): void
    {
        $this->seed(RolesSeeder::class);
        $cashier = User::factory()->create();
        $other = User::factory()->create();
        $cashier->assignRole('cashier');

        $this->assertTrue($cashier->hasRole('cashier'));
        $this->assertFalse($cashier->hasRole('owner'));
        $this->assertFalse($other->hasAnyRole(['cashier', 'owner', 'administrator']));
    }
}
