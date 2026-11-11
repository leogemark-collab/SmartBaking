<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductStock extends Model
{
    protected $fillable = ['branch_id', 'product_id', 'quantity_pieces'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['branch_id' => 'integer', 'product_id' => 'integer', 'quantity_pieces' => 'integer'];
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
}
