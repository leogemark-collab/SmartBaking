<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('branches', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('name');
            $table->string('timezone', 64)->default('Asia/Manila');
            $table->boolean('can_produce')->default(true);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('branch_user', function (Blueprint $table): void {
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('role', 32);
            $table->timestamps();
            $table->primary(['branch_id', 'user_id']);
        });

        Schema::create('products', function (Blueprint $table): void {
            $table->id();
            $table->string('sku', 64)->unique();
            $table->string('name');
            $table->string('category', 100)->nullable();
            $table->unsignedBigInteger('price_cents')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('ingredients', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 64)->unique();
            $table->string('name');
            $table->enum('unit', ['kg', 'L', 'pcs']);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('recipes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('version');
            $table->unsignedBigInteger('yield_pieces');
            $table->timestamps();
            $table->unique(['product_id', 'version']);
        });

        Schema::table('products', function (Blueprint $table): void {
            $table->foreignId('current_recipe_id')->nullable()->constrained('recipes')->restrictOnDelete();
        });

        Schema::create('recipe_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('recipe_id')->constrained()->restrictOnDelete();
            $table->foreignId('ingredient_id')->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('quantity_milli');
            $table->timestamps();
            $table->unique(['recipe_id', 'ingredient_id']);
        });

        Schema::create('ingredient_stocks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('ingredient_id')->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('quantity_milli')->default(0);
            $table->unsignedBigInteger('safety_milli')->default(0);
            $table->unsignedInteger('lead_days')->default(0);
            $table->unsignedBigInteger('pack_milli')->default(1000);
            $table->timestamps();
            $table->unique(['branch_id', 'ingredient_id']);
        });

        Schema::create('product_stocks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('quantity_pieces')->default(0);
            $table->timestamps();
            $table->unique(['branch_id', 'product_id']);
        });

        Schema::create('stock_movements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('ingredient_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->restrictOnDelete();
            $table->enum('kind', ['ingredient_receipt', 'production_consumption', 'production_output', 'sale']);
            // Ingredient units and finished-product pieces are represented in thousandths.
            $table->bigInteger('quantity_milli');
            $table->string('reference', 191);
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['branch_id', 'reference']);
            $table->index(['branch_id', 'created_at']);
        });

        Schema::create('stock_receipts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('ingredient_id')->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('quantity_milli');
            $table->string('reference', 191)->nullable();
            $table->uuid('request_key');
            $table->char('payload_hash', 64);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['branch_id', 'request_key']);
            $table->index(['branch_id', 'created_at']);
        });

        Schema::create('production_batches', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('recipe_id')->constrained()->restrictOnDelete();
            $table->json('recipe_snapshot');
            $table->unsignedBigInteger('batch_count');
            $table->unsignedBigInteger('planned_pieces');
            $table->unsignedBigInteger('actual_pieces')->nullable();
            $table->enum('status', ['planned', 'mixing', 'baking', 'completed'])->default('planned');
            $table->uuid('request_key');
            $table->char('payload_hash', 64);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['branch_id', 'request_key']);
            $table->index(['branch_id', 'status']);
        });

        Schema::create('sales', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->uuid('request_key');
            $table->char('payload_hash', 64);
            $table->unsignedBigInteger('subtotal_cents');
            $table->unsignedBigInteger('total_cents');
            $table->unsignedBigInteger('cash_cents');
            $table->unsignedBigInteger('change_cents');
            $table->timestamp('occurred_at');
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->unique(['branch_id', 'request_key']);
            $table->index(['branch_id', 'occurred_at']);
        });

        Schema::create('sale_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('sale_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->string('product_name');
            $table->unsignedBigInteger('quantity_pieces');
            $table->unsignedBigInteger('unit_price_cents');
            $table->unsignedBigInteger('line_total_cents');
            $table->timestamps();
        });

        $this->enforceSqliteQuantityBounds();
    }

    /**
     * SQLite ignores unsigned integer declarations. Guard the same bounds there,
     * including integer storage so fixed-unit quantities cannot become floats.
     */
    private function enforceSqliteQuantityBounds(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            return;
        }

        $checks = [
            'products' => ['price_cents' => 0],
            'recipes' => ['version' => 1, 'yield_pieces' => 1],
            'recipe_items' => ['quantity_milli' => 1],
            'ingredient_stocks' => ['quantity_milli' => 0, 'safety_milli' => 0, 'lead_days' => 0, 'pack_milli' => 1],
            'product_stocks' => ['quantity_pieces' => 0],
            'stock_receipts' => ['quantity_milli' => 1],
            'production_batches' => ['batch_count' => 1, 'planned_pieces' => 1],
            'sales' => ['subtotal_cents' => 0, 'total_cents' => 0, 'cash_cents' => 0, 'change_cents' => 0],
            'sale_items' => ['quantity_pieces' => 1, 'unit_price_cents' => 0, 'line_total_cents' => 0],
        ];

        foreach ($checks as $table => $columns) {
            $conditions = [];
            foreach ($columns as $column => $minimum) {
                $conditions[] = "typeof(NEW.\"{$column}\") = 'integer' AND NEW.\"{$column}\" >= {$minimum}";
            }

            $this->addSqliteGuard($table, implode(' AND ', $conditions));
        }

        $this->addSqliteGuard('stock_movements', implode(' AND ', [
            "typeof(NEW.quantity_milli) = 'integer'",
            'NEW.quantity_milli != 0',
            '((NEW.ingredient_id IS NOT NULL AND NEW.product_id IS NULL) OR (NEW.ingredient_id IS NULL AND NEW.product_id IS NOT NULL))',
        ]));
        $this->addSqliteGuard('production_batches', "NEW.actual_pieces IS NULL OR (typeof(NEW.actual_pieces) = 'integer' AND NEW.actual_pieces >= 0)", 'actual');
    }

    /**
     * @param  literal-string  $table
     * @param  literal-string  $condition
     * @param  literal-string  $suffix
     */
    private function addSqliteGuard(string $table, string $condition, string $suffix = 'quantities'): void
    {
        foreach (['INSERT', 'UPDATE'] as $operation) {
            $trigger = $table.'_'.$suffix.'_'.strtolower($operation);
            DB::unprepared("CREATE TRIGGER \"{$trigger}\" BEFORE {$operation} ON \"{$table}\"
                WHEN NOT ({$condition})
                BEGIN SELECT RAISE(ABORT, 'Invalid {$table} quantity or stock reference'); END");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('sales');
        Schema::dropIfExists('production_batches');
        Schema::dropIfExists('stock_receipts');
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('product_stocks');
        Schema::dropIfExists('ingredient_stocks');
        Schema::dropIfExists('recipe_items');

        Schema::table('products', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('current_recipe_id');
        });

        Schema::dropIfExists('recipes');
        Schema::dropIfExists('ingredients');
        Schema::dropIfExists('products');
        Schema::dropIfExists('branch_user');
        Schema::dropIfExists('branches');
    }
};
