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
use App\Models\StockMovement;
use App\Models\StockReceipt;
use App\Models\User;
use App\Services\BakeryOperations;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class BakeryOperationsTest extends TestCase
{
    use RefreshDatabase;

    private BakeryOperations $operations;

    private Branch $branch;

    private User $actor;

    private Product $product;

    private Ingredient $flour;

    private Ingredient $yeast;

    private Recipe $recipe;

    protected function setUp(): void
    {
        parent::setUp();
        $this->operations = app(BakeryOperations::class);
        $this->actor = User::factory()->create();
        $this->branch = Branch::query()->create(['code' => 'TEST', 'name' => 'Test bakery']);
        $this->product = Product::query()->create(['sku' => 'TEST-BREAD', 'name' => 'Test bread', 'price_cents' => 500]);
        $this->flour = Ingredient::query()->create(['code' => 'TEST-FLOUR', 'name' => 'Test flour', 'unit' => 'kg']);
        $this->yeast = Ingredient::query()->create(['code' => 'TEST-YEAST', 'name' => 'Test yeast', 'unit' => 'kg']);
        $this->recipe = Recipe::query()->create(['product_id' => $this->product->id, 'version' => 1, 'yield_pieces' => 50]);
        $this->recipe->items()->createMany([
            ['ingredient_id' => $this->flour->id, 'quantity_milli' => 2500],
            ['ingredient_id' => $this->yeast->id, 'quantity_milli' => 25],
        ]);
        $this->product->update(['current_recipe_id' => $this->recipe->id]);
        IngredientStock::query()->create(['branch_id' => $this->branch->id, 'ingredient_id' => $this->flour->id, 'quantity_milli' => 10000]);
        IngredientStock::query()->create(['branch_id' => $this->branch->id, 'ingredient_id' => $this->yeast->id, 'quantity_milli' => 1000]);
        ProductStock::query()->create(['branch_id' => $this->branch->id, 'product_id' => $this->product->id, 'quantity_pieces' => 20]);
    }

    public function test_receipt_increases_only_its_branch_and_retries_do_not_duplicate_stock(): void
    {
        $other = Branch::query()->create(['code' => 'OTHER', 'name' => 'Other bakery']);
        $data = ['ingredient_id' => $this->flour->id, 'quantity_milli' => 5000, 'reference' => 'Supplier delivery', 'request_key' => $this->key()];
        $receipt = $this->operations->receiveIngredient($this->branch, $this->actor, $data);
        $retry = $this->operations->receiveIngredient($this->branch, $this->actor, $data);
        $this->assertSame($receipt->id, $retry->id);
        $this->assertSame(15000, $this->flourBalance());
        $this->assertSame(1, StockReceipt::query()->count());
        $this->assertSame(1, StockMovement::query()->count());
        $this->assertDatabaseMissing('ingredient_stocks', ['branch_id' => $other->id]);
        $this->rejects(fn () => $this->operations->receiveIngredient($this->branch, $this->actor, [...$data, 'quantity_milli' => 6000]), 'request_key');
        $this->assertSame(15000, $this->flourBalance());
    }

    public function test_piece_ingredients_require_whole_pieces(): void
    {
        $eggs = Ingredient::query()->create(['code' => 'EGGS', 'name' => 'Eggs', 'unit' => 'pcs']);
        $data = ['ingredient_id' => $eggs->id, 'quantity_milli' => 1500, 'request_key' => $this->key()];
        $this->rejects(fn () => $this->operations->receiveIngredient($this->branch, $this->actor, $data), 'quantity_milli');
        $this->assertSame(0, StockReceipt::query()->count());
        $this->operations->receiveIngredient($this->branch, $this->actor, [...$data, 'quantity_milli' => 2000]);
        $this->assertDatabaseHas('ingredient_stocks', ['ingredient_id' => $eggs->id, 'quantity_milli' => 2000]);
    }

    public function test_sale_uses_server_prices_deducts_only_finished_stock_and_is_idempotent(): void
    {
        $data = ['items' => [
            ['product_id' => $this->product->id, 'quantity_pieces' => 1, 'unit_price_cents' => 1],
            ['product_id' => $this->product->id, 'quantity_pieces' => 2],
        ], 'cash_cents' => 2000, 'request_key' => $this->key()];
        $sale = $this->operations->checkout($this->branch, $this->actor, $data);
        $this->assertSame(1500, $sale->total_cents);
        $this->assertSame(500, $sale->change_cents);
        $this->assertSame(500, $sale->items->sole()->unit_price_cents);
        $this->assertSame(3, $sale->items->sole()->quantity_pieces);
        $this->assertSame(17, $this->breadBalance());
        $this->assertSame(10000, $this->flourBalance());
        $this->assertDatabaseHas('stock_movements', ['product_id' => $this->product->id, 'ingredient_id' => null, 'quantity_milli' => -3000, 'kind' => 'sale']);
        $this->product->update(['price_cents' => 700, 'name' => 'Renamed bread']);
        $retry = $this->operations->checkout($this->branch, $this->actor, [...$data, 'items' => [['product_id' => $this->product->id, 'quantity_pieces' => 3]]]);
        $this->assertSame($sale->id, $retry->id);
        $this->assertSame('Test bread', $retry->items->sole()->product_name);
        $this->assertSame(17, $this->breadBalance());
        $this->assertSame(1, Sale::query()->count());
        $this->rejects(fn () => $this->operations->checkout($this->branch, $this->actor, [...$data, 'cash_cents' => 2500]), 'request_key');
    }

    public function test_insufficient_stock_rolls_back_every_sale_line_and_all_movements(): void
    {
        $second = Product::query()->create(['sku' => 'SECOND', 'name' => 'Second bread', 'price_cents' => 100]);
        ProductStock::query()->create(['branch_id' => $this->branch->id, 'product_id' => $second->id, 'quantity_pieces' => 1]);
        $data = ['items' => [['product_id' => $this->product->id, 'quantity_pieces' => 2], ['product_id' => $second->id, 'quantity_pieces' => 2]], 'cash_cents' => 5000, 'request_key' => $this->key()];
        $this->rejects(fn () => $this->operations->checkout($this->branch, $this->actor, $data), 'stock');
        $this->assertSame(20, $this->breadBalance());
        $this->assertDatabaseHas('product_stocks', ['product_id' => $second->id, 'quantity_pieces' => 1]);
        $this->assertSame(0, Sale::query()->count());
        $this->assertSame(0, StockMovement::query()->count());
        $this->assertDatabaseCount('sale_items', 0);
    }

    public function test_a_second_sale_cannot_oversell_and_underpayment_changes_nothing(): void
    {
        $data = ['items' => [['product_id' => $this->product->id, 'quantity_pieces' => 15]], 'cash_cents' => 7500, 'request_key' => $this->key()];
        $this->rejects(fn () => $this->operations->checkout($this->branch, $this->actor, [...$data, 'cash_cents' => 1]), 'cash_cents');
        $this->assertSame(20, $this->breadBalance());
        $this->operations->checkout($this->branch, $this->actor, $data);
        $this->rejects(fn () => $this->operations->checkout($this->branch, $this->actor, [...$data, 'request_key' => $this->key()]), 'stock');
        $this->assertSame(5, $this->breadBalance());
        $this->assertSame(1, Sale::query()->count());
    }

    public function test_production_consumes_ingredients_once_at_mixing_and_adds_output_once(): void
    {
        $data = ['product_id' => $this->product->id, 'batch_count' => 2, 'request_key' => $this->key()];
        $batch = $this->operations->planProduction($this->branch, $this->actor, $data);
        $this->assertSame(100, $batch->planned_pieces);
        $this->assertSame($batch->id, $this->operations->planProduction($this->branch, $this->actor, $data)->id);
        $this->assertSame(10000, $this->flourBalance());
        $this->operations->advanceProduction($this->branch, $this->actor, $batch, ['status' => 'mixing']);
        $this->operations->advanceProduction($this->branch, $this->actor, $batch, ['status' => 'mixing']);
        $this->assertSame(5000, $this->flourBalance());
        $this->assertSame(20, $this->breadBalance());
        $this->assertSame(2, StockMovement::query()->count());
        $this->operations->advanceProduction($this->branch, $this->actor, $batch, ['status' => 'baking']);
        $completed = $this->operations->advanceProduction($this->branch, $this->actor, $batch, ['status' => 'completed', 'actual_pieces' => 95]);
        $retry = $this->operations->advanceProduction($this->branch, $this->actor, $batch, ['status' => 'completed', 'actual_pieces' => 95]);
        $this->assertSame($completed->id, $retry->id);
        $this->assertSame(115, $this->breadBalance());
        $this->assertSame(5000, $this->flourBalance());
        $this->assertSame(3, StockMovement::query()->count());
        $this->assertNotNull($completed->started_at);
        $this->assertNotNull($completed->completed_at);
        $this->rejects(fn () => $this->operations->advanceProduction($this->branch, $this->actor, $batch, ['status' => 'completed', 'actual_pieces' => 96]), 'actual_pieces');
    }

    public function test_planned_recipe_requirements_survive_later_recipe_changes(): void
    {
        $batch = $this->plan();
        $this->recipe->items()->where('ingredient_id', $this->flour->id)->update(['quantity_milli' => 9999]);
        $newRecipe = Recipe::query()->create(['product_id' => $this->product->id, 'version' => 2, 'yield_pieces' => 99]);
        $newRecipe->items()->create(['ingredient_id' => $this->flour->id, 'quantity_milli' => 9000]);
        $this->product->update(['current_recipe_id' => $newRecipe->id]);
        $this->operations->advanceProduction($this->branch, $this->actor, $batch, ['status' => 'mixing']);
        $this->assertSame($this->recipe->id, $batch->recipe_id);
        $this->assertSame(50, $batch->planned_pieces);
        $this->assertSame(7500, $this->flourBalance());
    }

    public function test_missing_ingredients_roll_back_other_consumption_and_keep_the_batch_planned(): void
    {
        IngredientStock::query()->where('ingredient_id', $this->yeast->id)->update(['quantity_milli' => 0]);
        $batch = $this->plan();
        $this->rejects(fn () => $this->operations->advanceProduction($this->branch, $this->actor, $batch, ['status' => 'mixing']), 'stock');
        $this->assertSame(10000, $this->flourBalance());
        $this->assertSame('planned', $batch->refresh()->status);
        $this->assertNull($batch->started_at);
        $this->assertSame(0, StockMovement::query()->count());
    }

    public function test_cross_branch_batches_and_skipped_stages_are_rejected(): void
    {
        $other = Branch::query()->create(['code' => 'OTHER', 'name' => 'Other bakery']);
        $batch = $this->plan();
        $this->rejects(fn () => $this->operations->advanceProduction($other, $this->actor, $batch, ['status' => 'mixing']), 'batch');
        $this->rejects(fn () => $this->operations->advanceProduction($this->branch, $this->actor, $batch, ['status' => 'baking']), 'status');
        $this->assertSame(10000, $this->flourBalance());
        $this->assertSame('planned', $batch->refresh()->status);
    }

    public function test_inactive_catalog_records_branches_and_nonproducing_branches_cannot_mutate_stock(): void
    {
        $this->flour->update(['active' => false]);
        $this->rejects(fn () => $this->operations->receiveIngredient($this->branch, $this->actor, ['ingredient_id' => $this->flour->id, 'quantity_milli' => 1000, 'request_key' => $this->key()]), 'ingredient_id');
        $this->product->update(['active' => false]);
        $this->rejects(fn () => $this->operations->checkout($this->branch, $this->actor, ['items' => [['product_id' => $this->product->id, 'quantity_pieces' => 1]], 'cash_cents' => 500, 'request_key' => $this->key()]), 'product_id');
        $this->product->update(['active' => true]);
        $this->flour->update(['active' => true]);
        $batch = $this->plan();
        $this->branch->update(['can_produce' => false]);
        $this->rejects(fn () => $this->plan(), 'branch');
        $this->rejects(fn () => $this->operations->advanceProduction($this->branch, $this->actor, $batch, ['status' => 'mixing']), 'branch');
        $this->branch->update(['active' => false]);
        $this->rejects(fn () => $this->operations->receiveIngredient($this->branch, $this->actor, ['ingredient_id' => $this->flour->id, 'quantity_milli' => 1000, 'request_key' => $this->key()]), 'branch');
        $this->assertSame(20, $this->breadBalance());
        $this->assertSame(10000, $this->flourBalance());
    }

    public function test_malformed_and_overflowing_values_are_rejected_without_records(): void
    {
        foreach ([-1, 0, 1.5, INF, '9007199254740993'] as $quantity) {
            $this->rejects(fn () => $this->operations->receiveIngredient($this->branch, $this->actor, ['ingredient_id' => $this->flour->id, 'quantity_milli' => $quantity, 'request_key' => $this->key()]), 'quantity_milli');
        }
        $this->rejects(fn () => $this->operations->planProduction($this->branch, $this->actor, ['product_id' => $this->product->id, 'batch_count' => 1001, 'request_key' => $this->key()]), 'batch_count');
        $this->product->update(['price_cents' => 1_000_000_000_000]);
        $this->rejects(fn () => $this->operations->checkout($this->branch, $this->actor, ['items' => [['product_id' => $this->product->id, 'quantity_pieces' => 2]], 'cash_cents' => 1_000_000_000_000, 'request_key' => $this->key()]), 'items');
        $this->assertSame(0, Sale::query()->count());
        $this->assertSame(0, StockReceipt::query()->count());
        $this->assertSame(10000, $this->flourBalance());
    }

    public function test_zero_actual_yield_completes_without_creating_finished_stock(): void
    {
        $batch = $this->plan();
        $this->operations->advanceProduction($this->branch, $this->actor, $batch, ['status' => 'mixing']);
        $this->operations->advanceProduction($this->branch, $this->actor, $batch, ['status' => 'baking']);
        $completed = $this->operations->advanceProduction($this->branch, $this->actor, $batch, ['status' => 'completed', 'actual_pieces' => 0]);
        $this->assertSame(0, $completed->actual_pieces);
        $this->assertSame(20, $this->breadBalance());
        $this->assertSame(7500, $this->flourBalance());
        $this->assertSame(0, StockMovement::query()->where('kind', 'production_output')->count());
    }

    private function plan(): ProductionBatch
    {
        return $this->operations->planProduction($this->branch, $this->actor, ['product_id' => $this->product->id, 'batch_count' => 1, 'request_key' => $this->key()]);
    }

    private function flourBalance(): int
    {
        return IngredientStock::query()->where('branch_id', $this->branch->id)->where('ingredient_id', $this->flour->id)->sole()->quantity_milli;
    }

    private function breadBalance(): int
    {
        return ProductStock::query()->where('branch_id', $this->branch->id)->where('product_id', $this->product->id)->sole()->quantity_pieces;
    }

    private function key(): string
    {
        return (string) Str::uuid();
    }

    private function rejects(callable $operation, string $field): void
    {
        try {
            $operation();
            $this->fail('The operation should have been rejected.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey($field, $exception->errors());
        }
    }
}
