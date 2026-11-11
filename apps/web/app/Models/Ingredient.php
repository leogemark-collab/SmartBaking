<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ingredient extends Model
{
    protected $fillable = ['code', 'name', 'unit', 'active'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }

    /** @return HasMany<RecipeItem, $this> */
    public function recipeItems(): HasMany
    {
        return $this->hasMany(RecipeItem::class);
    }

    /** @return HasMany<IngredientStock, $this> */
    public function ingredientStocks(): HasMany
    {
        return $this->hasMany(IngredientStock::class);
    }

    /** @return HasMany<StockReceipt, $this> */
    public function stockReceipts(): HasMany
    {
        return $this->hasMany(StockReceipt::class);
    }

    /** @return HasMany<StockMovement, $this> */
    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }
}
