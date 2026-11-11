<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property array<int, array{ingredient_id: int, unit: string, quantity_milli: int}>|null $recipe_snapshot
 */
class ProductionBatch extends Model
{
    protected $fillable = [
        'branch_id', 'product_id', 'recipe_id', 'recipe_snapshot', 'batch_count', 'planned_pieces',
        'actual_pieces', 'status', 'request_key', 'payload_hash', 'created_by', 'started_at', 'completed_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'branch_id' => 'integer',
            'product_id' => 'integer',
            'recipe_id' => 'integer',
            'recipe_snapshot' => 'array',
            'batch_count' => 'integer',
            'planned_pieces' => 'integer',
            'actual_pieces' => 'integer',
            'created_by' => 'integer',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Branch, $this> */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** @return BelongsTo<Recipe, $this> */
    public function recipe(): BelongsTo
    {
        return $this->belongsTo(Recipe::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
