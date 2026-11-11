<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Ingredient;
use App\Models\IngredientStock;
use App\Models\Product;
use App\Models\ProductionBatch;
use App\Models\ProductStock;
use App\Models\Recipe;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class LiveWorkspaceTest extends TestCase
{
    use RefreshDatabase;

    public function test_initial_local_setup_explicitly_claims_owner_and_cannot_be_claimed_again(): void
    {
        config(['smartbaking.allow_initial_setup' => true]);
        $owner = User::factory()->create();
        $this->actingAs($owner)->post('/operations/bootstrap', ['code' => 'CENTRAL', 'name' => 'Central'])->assertRedirect(route('setup'));
        $this->assertTrue($owner->fresh()->hasRole('owner'));
        $this->assertDatabaseHas('branches', ['code' => 'CENTRAL', 'can_produce' => true]);
        $other = User::factory()->create();
        $this->actingAs($other)->post('/operations/bootstrap', ['code' => 'OTHER', 'name' => 'Other'])->assertSessionHasErrors('setup');
        $this->assertFalse($other->fresh()->hasRole('owner'));
        $this->assertDatabaseCount('branches', 1);
    }

    public function test_web_setup_is_disabled_outside_an_explicitly_allowed_installation(): void
    {
        config(['smartbaking.allow_initial_setup' => false]);
        $this->actingAs(User::factory()->create())->post('/operations/bootstrap', ['code' => 'CENTRAL', 'name' => 'Central'])->assertForbidden();
        $this->assertDatabaseCount('branches', 0);
    }

    public function test_unassigned_staff_see_empty_real_data_and_cannot_create_catalog_records(): void
    {
        $this->owner();
        $staff = User::factory()->create();
        Product::query()->create(['sku' => 'BREAD', 'name' => 'Bread', 'price_cents' => 500]);
        $this->actingAs($staff)->get('/dashboard')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('operations/workspace')->where('mode', 'live')->where('currentBranch', null)
            ->has('catalog.products', 0)->where('summary.sales_cents', 0)->where('capabilities.manage_catalog', false));
        $this->post('/operations/products', ['sku' => 'OTHER', 'name' => 'Other', 'price_cents' => 100])->assertForbidden();
    }

    public function test_catalog_to_production_to_cash_sale_persists_and_retries_do_not_duplicate_stock_changes(): void
    {
        $owner = $this->owner();
        $branch = $this->branch();
        $this->actingAs($owner);
        $this->post('/operations/products', ['sku' => 'BREAD', 'name' => 'Bread', 'price_cents' => 500])->assertSessionHasNoErrors();
        $this->post('/operations/ingredients', ['code' => 'FLOUR', 'name' => 'Flour', 'unit' => 'kg'])->assertSessionHasNoErrors();
        $product = Product::query()->sole();
        $ingredient = Ingredient::query()->sole();
        $this->post('/operations/recipes', ['product_id' => $product->id, 'yield_pieces' => 10, 'items' => [['ingredient_id' => $ingredient->id, 'quantity_milli' => 1000]]])->assertSessionHasNoErrors();
        $receipt = ['branch_id' => $branch->id, 'ingredient_id' => $ingredient->id, 'quantity_milli' => 2000, 'request_key' => (string) Str::uuid()];
        $this->post('/operations/receipts', $receipt)->assertSessionHasNoErrors();
        $this->post('/operations/receipts', $receipt)->assertSessionHasNoErrors();
        $this->assertSame(2000, IngredientStock::query()->sole()->quantity_milli);
        $plan = ['branch_id' => $branch->id, 'product_id' => $product->id, 'batch_count' => 1, 'request_key' => (string) Str::uuid()];
        $this->post('/operations/production', $plan)->assertSessionHasNoErrors();
        $this->post('/operations/production', $plan)->assertSessionHasNoErrors();
        $batch = ProductionBatch::query()->sole();
        $this->assertSame(2000, IngredientStock::query()->sole()->quantity_milli);
        foreach (['mixing', 'mixing', 'baking'] as $stage) {
            $this->patch('/operations/production/'.$batch->id, ['branch_id' => $branch->id, 'status' => $stage])->assertSessionHasNoErrors();
        }
        $complete = ['branch_id' => $branch->id, 'status' => 'completed', 'actual_pieces' => 9];
        $this->patch('/operations/production/'.$batch->id, $complete)->assertSessionHasNoErrors();
        $this->patch('/operations/production/'.$batch->id, $complete)->assertSessionHasNoErrors();
        $sale = ['branch_id' => $branch->id, 'items' => [['product_id' => $product->id, 'quantity_pieces' => 2]], 'cash_cents' => 2000, 'request_key' => (string) Str::uuid()];
        $this->post('/operations/sales', $sale)->assertSessionHasNoErrors();
        $this->post('/operations/sales', $sale)->assertSessionHasNoErrors();
        $this->assertSame(1000, IngredientStock::query()->sole()->quantity_milli);
        $this->assertSame(7, ProductStock::query()->sole()->quantity_pieces);
        $this->assertDatabaseHas('sales', ['total_cents' => 1000, 'cash_cents' => 2000, 'change_cents' => 1000]);
        $this->assertDatabaseCount('sale_items', 1);
        $this->assertDatabaseCount('stock_movements', 4);
        $this->get('/dashboard?branch='.$branch->id)->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('summary.sales_cents', 1000)->where('summary.sale_count', 1)->where('summary.produced_pieces', 9));
        $sale['request_key'] = (string) Str::uuid();
        $sale['items'][0]['quantity_pieces'] = 8;
        $sale['cash_cents'] = 10000;
        $this->post('/operations/sales', $sale)->assertSessionHasErrors('stock');
        $this->assertDatabaseCount('sales', 1);
        $this->assertSame(7, ProductStock::query()->sole()->quantity_pieces);
    }

    public function test_branch_access_applies_to_reads_aggregates_and_writes(): void
    {
        $this->owner();
        $a = $this->branch('A');
        $b = $this->branch('B');
        $staff = User::factory()->create();
        $a->users()->attach($staff->id, ['role' => 'cashier']);
        $this->actingAs($staff)->get('/dashboard?branch='.$a->id)->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('availableBranches', 1)->where('currentBranch.id', $a->id)->where('capabilities.sell', true)->where('capabilities.produce', false)
            ->where('summary.sales_cents', 0)->has('records.memberships', 0));
        foreach (['dashboard', 'inventory', 'production', 'reports', 'forecasts', 'team', 'setup'] as $screen) {
            $this->get('/'.$screen.'?branch='.$b->id)->assertForbidden();
        }
        foreach (['receipts', 'production', 'sales'] as $path) {
            $this->post('/operations/'.$path, ['branch_id' => $b->id])->assertForbidden();
        }
        $this->post('/operations/receipts', ['branch_id' => $a->id])->assertForbidden();
        $this->post('/operations/production', ['branch_id' => $a->id])->assertForbidden();
        $this->post('/operations/memberships', ['branch_id' => $a->id, 'email' => $staff->email, 'role' => 'supervisor'])->assertForbidden();
    }

    public function test_only_an_owner_can_grant_existing_verified_staff_branch_roles(): void
    {
        $owner = $this->owner();
        $branch = $this->branch();
        $staff = User::factory()->create();
        $this->actingAs($owner)->post('/operations/memberships', ['branch_id' => $branch->id, 'email' => $staff->email, 'role' => 'baker'])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('branch_user', ['branch_id' => $branch->id, 'user_id' => $staff->id, 'role' => 'baker']);
        $this->assertFalse($staff->fresh()->hasRole('owner'));
        $pending = User::factory()->unverified()->create();
        $this->post('/operations/memberships', ['branch_id' => $branch->id, 'email' => $pending->email, 'role' => 'supervisor'])->assertSessionHasErrors('email');
        $this->actingAs($staff)->post('/operations/sales', ['branch_id' => $branch->id])->assertForbidden();
    }

    public function test_recipes_are_new_versions_and_piece_ingredients_require_whole_units(): void
    {
        $this->actingAs($this->owner());
        $product = Product::query()->create(['sku' => 'ROLL', 'name' => 'Roll', 'price_cents' => 500]);
        $ingredient = Ingredient::query()->create(['code' => 'EGG', 'name' => 'Egg', 'unit' => 'pcs']);
        $data = ['product_id' => $product->id, 'yield_pieces' => 10, 'items' => [['ingredient_id' => $ingredient->id, 'quantity_milli' => 500]]];
        $this->post('/operations/recipes', $data)->assertSessionHasErrors('items.0.quantity_milli');
        $this->assertDatabaseCount('recipes', 0);
        $data['items'][0]['quantity_milli'] = 1000;
        $this->post('/operations/recipes', $data)->assertSessionHasNoErrors();
        $first = Recipe::query()->sole();
        $data['items'][0]['quantity_milli'] = 2000;
        $this->post('/operations/recipes', $data)->assertSessionHasNoErrors();
        $this->assertDatabaseCount('recipes', 2);
        $this->assertSame(1000, $first->items()->sole()->quantity_milli);
        $this->assertSame(2, $product->fresh()->currentRecipe->version);
    }

    public function test_daily_reporting_uses_manila_boundaries_instead_of_utc_midnight(): void
    {
        $owner = $this->owner();
        $branch = $this->branch();
        foreach (['2026-12-31 15:59:59', '2026-12-31 16:00:00', '2027-01-01 16:00:00'] as $time) {
            Sale::query()->create(['branch_id' => $branch->id, 'request_key' => (string) Str::uuid(), 'payload_hash' => str_repeat('a', 64), 'subtotal_cents' => 500, 'total_cents' => 500, 'cash_cents' => 500, 'change_cents' => 0, 'occurred_at' => $time, 'created_by' => $owner->id]);
        }
        $this->actingAs($owner)->get('/reports?branch='.$branch->id.'&from=2027-01-01&to=2027-01-01')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('summary.sale_count', 1)->where('summary.sales_cents', 500)->has('records.sales', 1));
        $this->get('/reports?branch='.$branch->id.'&from=2027-01-02&to=2027-01-01')->assertSessionHasErrors('from');
    }

    public function test_setup_and_transaction_endpoints_require_verified_authentication(): void
    {
        $this->get('/setup')->assertRedirect('/login');
        $this->post('/operations/sales')->assertRedirect('/login');
        $this->actingAs(User::factory()->unverified()->create())->post('/operations/bootstrap')->assertRedirect(route('verification.notice'));
        $this->get('/setup')->assertRedirect(route('verification.notice'));
    }

    public function test_linked_staff_accounts_are_retained_for_access_and_audit_history(): void
    {
        $user = User::factory()->create();
        $branch = $this->branch();
        $branch->users()->attach($user->id, ['role' => 'baker']);
        $this->actingAs($user)->delete(route('profile.destroy'), ['password' => 'password'])->assertSessionHasErrors('password');
        $this->assertAuthenticatedAs($user);
        $this->assertNotNull($user->fresh());
    }

    public function test_checkout_receipt_is_the_selected_sale_even_when_a_later_sale_exists(): void
    {
        $owner = $this->owner();
        $branch = $this->branch();
        $otherBranch = $this->branch('OTHER');
        $makeSale = fn (Branch $target) => Sale::query()->create([
            'branch_id' => $target->id, 'request_key' => (string) Str::uuid(), 'payload_hash' => str_repeat('a', 64),
            'subtotal_cents' => 500, 'total_cents' => 500, 'cash_cents' => 1000, 'change_cents' => 500,
            'occurred_at' => now('UTC'), 'created_by' => $owner->id,
        ]);
        $selected = $makeSale($branch);
        $latest = $makeSale($branch);
        $foreign = $makeSale($otherBranch);
        $this->actingAs($owner)->get('/pos?branch='.$branch->id.'&receipt='.$selected->id)->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('checkoutReceipt.id', $selected->id)->where('records.sales.0.id', $latest->id));
        $this->get('/pos?branch='.$branch->id.'&receipt='.$foreign->id)->assertNotFound();
    }

    private function owner(): User
    {
        Role::findOrCreate('owner', 'web');
        $user = User::factory()->create();
        $user->assignRole('owner');

        return $user;
    }

    private function branch(string $code = 'CENTRAL'): Branch
    {
        return Branch::query()->create(['code' => $code, 'name' => $code.' bakery', 'active' => true, 'can_produce' => true]);
    }
}
