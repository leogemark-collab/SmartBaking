<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Recipe extends Model
{
    protected $fillable = ['product_id', 'version', 'yield_pieces'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['product_id' => 'integer', 'version' => 'integer', 'yield_pieces' => 'integer'];
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** @return HasMany<RecipeItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(RecipeItem::class);
    }

    /** @return HasMany<ProductionBatch, $this> */
    public function productionBatches(): HasMany
    {
        return $this->hasMany(ProductionBatch::class);
    }
}
