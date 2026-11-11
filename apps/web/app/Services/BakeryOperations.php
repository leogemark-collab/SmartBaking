<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Ingredient;
use App\Models\IngredientStock;
use App\Models\Product;
use App\Models\ProductionBatch;
use App\Models\ProductStock;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\StockReceipt;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/** Authoritative inventory writes. Controllers remain responsible for branch authorization. */
class BakeryOperations
{
    private const MAX = 1_000_000_000_000;

    /** @param array<string, mixed> $data */
    public function receiveIngredient(Branch $branch, User $actor, array $data): StockReceipt
    {
        Validator::make($data, ['reference' => ['nullable', 'string', 'max:120']])->validate();
        $payload = [
            'ingredient_id' => $this->integer($data['ingredient_id'] ?? null, 'ingredient_id', 1),
            'quantity_milli' => $this->integer($data['quantity_milli'] ?? null, 'quantity_milli', 1),
            'reference' => isset($data['reference']) ? trim($data['reference']) ?: null : null,
        ];

        return $this->idempotent(StockReceipt::class, $branch, $actor, $data, $payload, function (Branch $lockedBranch) use ($actor, $payload, $data): StockReceipt {
            $ingredient = $this->ingredient($payload['ingredient_id']);
            $this->validateUnitQuantity($ingredient->unit, $payload['quantity_milli'], 'quantity_milli');
            $stock = IngredientStock::query()->firstOrCreate(
                ['branch_id' => $lockedBranch->id, 'ingredient_id' => $ingredient->id],
                ['quantity_milli' => 0],
            );
            $this->increase($stock, 'quantity_milli', $payload['quantity_milli']);
            $receipt = StockReceipt::query()->create([
                ...$payload,
                'branch_id' => $lockedBranch->id,
                'request_key' => $this->requestKey($data),
                'payload_hash' => $this->hash($payload),
                'created_by' => $actor->id,
                'created_at' => now('UTC'),
            ]);
            $this->movement($lockedBranch, $actor, 'ingredient_receipt', 'receipt:'.$receipt->id, $payload['quantity_milli'], ingredientId: $ingredient->id);

            return $receipt->refresh()->load('ingredient');
        });
    }

    /** @param array<string, mixed> $data */
    public function planProduction(Branch $branch, User $actor, array $data): ProductionBatch
    {
        $payload = [
            'product_id' => $this->integer($data['product_id'] ?? null, 'product_id', 1),
            'batch_count' => $this->integer($data['batch_count'] ?? null, 'batch_count', 1, 1000),
        ];

        return $this->idempotent(ProductionBatch::class, $branch, $actor, $data, $payload, function (Branch $lockedBranch) use ($actor, $payload, $data): ProductionBatch {
            $this->assertProducing($lockedBranch);
            $product = $this->product($payload['product_id']);
            $recipe = $product->currentRecipe()->with('items.ingredient')->lockForUpdate()->first();
            if (! $recipe || $recipe->product_id !== $product->id || $recipe->items->isEmpty()) {
                $this->fail('product_id', 'This product needs a current recipe with ingredients before production can be planned.');
            }
            $yield = $this->integer($recipe->yield_pieces, 'recipe', 1, 1_000_000);
            $snapshot = [];
            foreach ($recipe->items->sortBy('ingredient_id') as $item) {
                if (! $item->ingredient || ! $item->ingredient->active) {
                    $this->fail('product_id', 'All recipe ingredients must be active.');
                }
                $quantity = $this->integer($item->quantity_milli, 'recipe', 1, 1_000_000_000);
                $this->validateUnitQuantity($item->ingredient->unit, $quantity, 'recipe');
                $this->multiply($quantity, $payload['batch_count'], 'batch_count');
                $snapshot[] = ['ingredient_id' => $item->ingredient_id, 'unit' => $item->ingredient->unit, 'quantity_milli' => $quantity];
            }
            $batch = ProductionBatch::query()->create([
                ...$payload,
                'branch_id' => $lockedBranch->id,
                'recipe_id' => $recipe->id,
                'recipe_snapshot' => $snapshot,
                'planned_pieces' => $this->multiply($yield, $payload['batch_count'], 'batch_count'),
                'status' => 'planned',
                'request_key' => $this->requestKey($data),
                'payload_hash' => $this->hash($payload),
                'created_by' => $actor->id,
            ]);

            return $batch->refresh()->load(['product', 'recipe']);
        });
    }

    /** @param array<string, mixed> $data */
    public function advanceProduction(Branch $branch, User $actor, ProductionBatch $batch, array $data): ProductionBatch
    {
        Validator::make($data, ['status' => ['required', 'in:mixing,baking,completed']])->validate();
        $status = $data['status'];
        $actual = $status === 'completed' ? $this->integer($data['actual_pieces'] ?? null, 'actual_pieces', 0, intdiv(self::MAX, 1000)) : null;
        if ($status !== 'completed' && isset($data['actual_pieces'])) {
            $this->fail('actual_pieces', 'Actual output is recorded only when a batch is completed.');
        }

        return DB::transaction(function () use ($branch, $actor, $batch, $status, $actual): ProductionBatch {
            $lockedBranch = $this->lockedBranch($branch, $actor);
            $this->assertProducing($lockedBranch);
            $current = ProductionBatch::query()->whereKey($batch->getKey())->where('branch_id', $lockedBranch->id)->lockForUpdate()->first();
            if (! $current) {
                $this->fail('batch', 'This production batch does not belong to the selected branch.');
            }
            if ($current->status === $status) {
                if ($status === 'completed' && $current->actual_pieces !== $actual) {
                    $this->fail('actual_pieces', 'This batch was already completed with a different actual output.');
                }

                return $current->load(['product', 'recipe']);
            }
            $expected = ['planned' => 'mixing', 'mixing' => 'baking', 'baking' => 'completed'];
            if (($expected[$current->status] ?? null) !== $status) {
                $this->fail('status', 'Move this batch through mixing, baking, and completion in order.');
            }
            $product = $this->product($current->product_id);
            if ($status === 'mixing') {
                $snapshot = $current->getAttribute('recipe_snapshot');
                if (! is_array($snapshot) || $snapshot === []) {
                    $this->fail('recipe', 'This batch has no saved ingredient requirements.');
                }
                foreach ($snapshot as $requirement) {
                    if (! is_array($requirement)) {
                        $this->fail('recipe', 'This batch has invalid saved ingredient requirements.');
                    }
                    $ingredient = $this->ingredient($requirement['ingredient_id'] ?? null);
                    if ($ingredient->unit !== ($requirement['unit'] ?? null)) {
                        $this->fail('recipe', 'An ingredient unit changed after this batch was planned.');
                    }
                    $perBatch = $this->integer($requirement['quantity_milli'] ?? null, 'recipe', 1, 1_000_000_000);
                    $this->validateUnitQuantity($ingredient->unit, $perBatch, 'recipe');
                    $required = $this->multiply($perBatch, $current->batch_count, 'batch_count');
                    $affected = IngredientStock::query()->where('branch_id', $lockedBranch->id)->where('ingredient_id', $ingredient->id)->where('quantity_milli', '>=', $required)->decrement('quantity_milli', $required);
                    if ($affected !== 1) {
                        $this->fail('stock', 'Insufficient '.$ingredient->name.' for this batch. No ingredients were consumed.');
                    }
                    $this->movement($lockedBranch, $actor, 'production_consumption', 'batch:'.$current->id.':ingredient:'.$ingredient->id, -$required, ingredientId: $ingredient->id);
                }
                $current->started_at = now('UTC');
            }
            if ($status === 'completed') {
                if ($actual === null) {
                    $this->fail('actual_pieces', 'Actual usable output is required to complete a batch.');
                }
                $stock = ProductStock::query()->firstOrCreate(['branch_id' => $lockedBranch->id, 'product_id' => $product->id], ['quantity_pieces' => 0]);
                $this->increase($stock, 'quantity_pieces', $actual);
                if ($actual > 0) {
                    $this->movement($lockedBranch, $actor, 'production_output', 'batch:'.$current->id.':output', $this->multiply($actual, 1000, 'actual_pieces'), productId: $product->id);
                }
                $current->actual_pieces = $actual;
                $current->completed_at = now('UTC');
            }
            $current->status = $status;
            $current->save();

            return $current->refresh()->load(['product', 'recipe']);
        }, 5);
    }

    /** @param array<string, mixed> $data */
    public function checkout(Branch $branch, User $actor, array $data): Sale
    {
        Validator::make($data, ['items' => ['required', 'array', 'min:1', 'max:100'], 'items.*' => ['required', 'array']])->validate();
        $quantities = [];
        foreach ($data['items'] as $index => $item) {
            $id = $this->integer($item['product_id'] ?? null, "items.$index.product_id", 1);
            $quantity = $this->integer($item['quantity_pieces'] ?? null, "items.$index.quantity_pieces", 1, 1_000_000);
            $quantities[$id] = $this->add($quantities[$id] ?? 0, $quantity, 'items');
        }
        ksort($quantities, SORT_NUMERIC);
        $payload = ['items' => [], 'cash_cents' => $this->integer($data['cash_cents'] ?? null, 'cash_cents', 0)];
        foreach ($quantities as $id => $quantity) {
            $payload['items'][] = ['product_id' => (int) $id, 'quantity_pieces' => $quantity];
        }

        return $this->idempotent(Sale::class, $branch, $actor, $data, $payload, function (Branch $lockedBranch) use ($actor, $payload, $data): Sale {
            $lines = [];
            $subtotal = 0;
            foreach ($payload['items'] as $item) {
                $product = $this->product($item['product_id']);
                $price = $this->integer($product->price_cents, 'items', 0);
                $lineTotal = $this->multiply($price, $item['quantity_pieces'], 'items');
                $subtotal = $this->add($subtotal, $lineTotal, 'items');
                $lines[] = ['product_id' => $product->id, 'product_name' => $product->name, 'quantity_pieces' => $item['quantity_pieces'], 'unit_price_cents' => $price, 'line_total_cents' => $lineTotal];
            }
            if ($payload['cash_cents'] < $subtotal) {
                $this->fail('cash_cents', 'Cash received is less than the order total.');
            }
            $sale = Sale::query()->create([
                'branch_id' => $lockedBranch->id,
                'request_key' => $this->requestKey($data),
                'payload_hash' => $this->hash($payload),
                'subtotal_cents' => $subtotal,
                'total_cents' => $subtotal,
                'cash_cents' => $payload['cash_cents'],
                'change_cents' => $payload['cash_cents'] - $subtotal,
                'occurred_at' => now('UTC'),
                'created_by' => $actor->id,
            ]);
            foreach ($lines as $line) {
                $affected = ProductStock::query()->where('branch_id', $lockedBranch->id)->where('product_id', $line['product_id'])->where('quantity_pieces', '>=', $line['quantity_pieces'])->decrement('quantity_pieces', $line['quantity_pieces']);
                if ($affected !== 1) {
                    $this->fail('stock', 'Insufficient finished stock for '.$line['product_name'].'. The sale was not recorded.');
                }
                $sale->items()->create($line);
                $this->movement($lockedBranch, $actor, 'sale', 'sale:'.$sale->id.':product:'.$line['product_id'], -$this->multiply($line['quantity_pieces'], 1000, 'items'), productId: $line['product_id']);
            }

            return $sale->refresh()->load('items');
        });
    }

    /** @template T of Model
     * @param  class-string<T>  $model
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>  $payload
     * @param  callable(Branch): T  $operation
     * @return T
     */
    private function idempotent(string $model, Branch $branch, User $actor, array $data, array $payload, callable $operation): Model
    {
        $key = $this->requestKey($data);
        $hash = $this->hash($payload);
        try {
            return DB::transaction(function () use ($model, $branch, $actor, $key, $hash, $operation) {
                $lockedBranch = $this->lockedBranch($branch, $actor);
                $existing = $model::query()->where('branch_id', $lockedBranch->id)->where('request_key', $key)->lockForUpdate()->first();
                if ($existing) {
                    $this->assertMatchingPayload($existing, $hash);

                    return $this->withOperationRelations($existing);
                }

                return $operation($lockedBranch);
            }, 5);
        } catch (UniqueConstraintViolationException $exception) {
            // A concurrent duplicate can win the insert after our first lookup.
            $existing = $model::query()->where('branch_id', $branch->id)->where('request_key', $key)->first();
            if (! $existing) {
                throw $exception;
            }
            $this->assertMatchingPayload($existing, $hash);

            return $this->withOperationRelations($existing);
        }
    }

    /**
     * @template T of Model
     *
     * @param  T  $model
     * @return T
     */
    private function withOperationRelations(Model $model): Model
    {
        return $model->load(match (true) {
            $model instanceof Sale => ['items'],
            $model instanceof ProductionBatch => ['product', 'recipe'],
            $model instanceof StockReceipt => ['ingredient'],
            default => [],
        });
    }

    private function assertMatchingPayload(Model $existing, string $hash): void
    {
        if (! hash_equals((string) $existing->getAttribute('payload_hash'), $hash)) {
            $this->fail('request_key', 'This request key was already used with different data.');
        }
    }

    private function lockedBranch(Branch $branch, User $actor): Branch
    {
        $current = Branch::query()->whereKey($branch->getKey())->lockForUpdate()->first();
        if (! $current || ! $current->active) {
            $this->fail('branch', 'The selected branch is unavailable or inactive.');
        }
        if (! $actor->exists || ! User::query()->whereKey($actor->getKey())->exists()) {
            $this->fail('actor', 'A saved user is required for inventory operations.');
        }

        return $current;
    }

    private function assertProducing(Branch $branch): void
    {
        if (! $branch->can_produce) {
            $this->fail('branch', 'Production is disabled for this branch.');
        }
    }

    private function product(mixed $id): Product
    {
        $id = $this->integer($id, 'product_id', 1);
        $product = Product::query()->whereKey($id)->lockForUpdate()->first();
        if (! $product || ! $product->active) {
            $this->fail('product_id', 'The selected product is unavailable or inactive.');
        }

        return $product;
    }

    private function ingredient(mixed $id): Ingredient
    {
        $id = $this->integer($id, 'ingredient_id', 1);
        $ingredient = Ingredient::query()->whereKey($id)->lockForUpdate()->first();
        if (! $ingredient || ! $ingredient->active) {
            $this->fail('ingredient_id', 'The selected ingredient is unavailable or inactive.');
        }

        return $ingredient;
    }

    private function increase(Model $stock, string $column, int $quantity): void
    {
        if ($quantity === 0) {
            return;
        }
        $affected = $stock->newQuery()->whereKey($stock->getKey())->where($column, '>=', 0)->where($column, '<=', self::MAX - $quantity)->increment($column, $quantity);
        if ($affected !== 1) {
            $this->fail('stock', 'This operation would exceed the supported stock balance.');
        }
    }

    private function movement(Branch $branch, User $actor, string $kind, string $reference, int $quantity, ?int $ingredientId = null, ?int $productId = null): void
    {
        StockMovement::query()->create([
            'branch_id' => $branch->id,
            'ingredient_id' => $ingredientId,
            'product_id' => $productId,
            'quantity_milli' => $quantity,
            'kind' => $kind,
            'reference' => $reference,
            'actor_id' => $actor->id,
            'created_at' => now('UTC'),
        ]);
    }

    private function validateUnitQuantity(string $unit, int $quantity, string $field): void
    {
        if (! in_array($unit, ['kg', 'L', 'pcs'], true) || ($unit === 'pcs' && $quantity % 1000 !== 0)) {
            $this->fail($field, 'Piece ingredients require whole pieces (multiples of 1000 milli-units).');
        }
    }

    /** @param array<string, mixed> $data */
    private function requestKey(array $data): string
    {
        Validator::make($data, ['request_key' => ['required', 'string', 'uuid']])->validate();

        return strtolower($data['request_key']);
    }

    /** @param array<string, mixed> $payload */
    private function hash(array $payload): string
    {
        return hash('sha256', json_encode($payload, JSON_THROW_ON_ERROR));
    }

    /** @return int<0, 1000000000000> */
    private function integer(mixed $value, string $field, int $min, int $max = self::MAX): int
    {
        if (! is_int($value) && ! (is_string($value) && preg_match('/^\d+$/D', $value))) {
            $this->fail($field, 'Use a whole-number value within the supported range.');
        }
        $normalized = ltrim((string) $value, '0') ?: '0';
        if (strlen($normalized) > strlen((string) $max) || (strlen($normalized) === strlen((string) $max) && strcmp($normalized, (string) $max) > 0)) {
            $this->fail($field, 'The value exceeds the supported range.');
        }
        $number = (int) $normalized;
        if ($number < 0 || $number < $min || $number > $max || $number > self::MAX) {
            $this->fail($field, 'The value is outside the supported range.');
        }

        return $number;
    }

    private function multiply(int $left, int $right, string $field): int
    {
        if ($left < 0 || $right < 0 || ($left !== 0 && $right > intdiv(self::MAX, $left))) {
            $this->fail($field, 'The calculated quantity exceeds the supported range.');
        }

        return $left * $right;
    }

    private function add(int $left, int $right, string $field): int
    {
        if ($left < 0 || $right < 0 || $right > self::MAX - $left) {
            $this->fail($field, 'The calculated total exceeds the supported range.');
        }

        return $left + $right;
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
