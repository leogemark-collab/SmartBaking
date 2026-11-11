<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    public $timestamps = false;

    protected $fillable = ['branch_id', 'ingredient_id', 'product_id', 'kind', 'quantity_milli', 'reference', 'actor_id', 'created_at'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'branch_id' => 'integer',
            'ingredient_id' => 'integer',
            'product_id' => 'integer',
            'quantity_milli' => 'integer',
            'actor_id' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Branch, $this> */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /** @return BelongsTo<Ingredient, $this> */
    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class);
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
