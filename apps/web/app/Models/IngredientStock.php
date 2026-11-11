<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IngredientStock extends Model
{
    protected $fillable = ['branch_id', 'ingredient_id', 'quantity_milli', 'safety_milli', 'lead_days', 'pack_milli'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'branch_id' => 'integer',
            'ingredient_id' => 'integer',
            'quantity_milli' => 'integer',
            'safety_milli' => 'integer',
            'lead_days' => 'integer',
            'pack_milli' => 'integer',
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
}
