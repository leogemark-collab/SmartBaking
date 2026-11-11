<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = ['sku', 'name', 'category', 'price_cents', 'active', 'current_recipe_id'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['price_cents' => 'integer', 'active' => 'boolean', 'current_recipe_id' => 'integer'];
    }

    /** @return BelongsTo<Recipe, $this> */
    public function currentRecipe(): BelongsTo
    {
        return $this->belongsTo(Recipe::class, 'current_recipe_id');
    }

    /** @return HasMany<Recipe, $this> */
    public function recipes(): HasMany
    {
        return $this->hasMany(Recipe::class);
    }

    /** @return HasMany<ProductStock, $this> */
    public function productStocks(): HasMany
    {
        return $this->hasMany(ProductStock::class);
    }

    /** @return HasMany<ProductionBatch, $this> */
    public function productionBatches(): HasMany
    {
        return $this->hasMany(ProductionBatch::class);
    }

    /** @return HasMany<SaleItem, $this> */
    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }
}
