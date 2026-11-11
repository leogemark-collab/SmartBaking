<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Branch extends Model
{
    protected $fillable = ['code', 'name', 'timezone', 'can_produce', 'active'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['can_produce' => 'boolean', 'active' => 'boolean'];
    }

    /** @return BelongsToMany<User, $this> */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withPivot('role')->withTimestamps();
    }

    /** @return HasMany<IngredientStock, $this> */
    public function ingredientStocks(): HasMany
    {
        return $this->hasMany(IngredientStock::class);
    }

    /** @return HasMany<ProductStock, $this> */
    public function productStocks(): HasMany
    {
        return $this->hasMany(ProductStock::class);
    }

    /** @return HasMany<StockMovement, $this> */
    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    /** @return HasMany<StockReceipt, $this> */
    public function stockReceipts(): HasMany
    {
        return $this->hasMany(StockReceipt::class);
    }

    /** @return HasMany<ProductionBatch, $this> */
    public function productionBatches(): HasMany
    {
        return $this->hasMany(ProductionBatch::class);
    }

    /** @return HasMany<Sale, $this> */
    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }
}
