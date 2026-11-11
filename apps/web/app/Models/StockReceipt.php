<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockReceipt extends Model
{
    public $timestamps = false;

    protected $fillable = ['branch_id', 'ingredient_id', 'quantity_milli', 'reference', 'request_key', 'payload_hash', 'created_by', 'created_at'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'branch_id' => 'integer',
            'ingredient_id' => 'integer',
            'quantity_milli' => 'integer',
            'created_by' => 'integer',
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

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
