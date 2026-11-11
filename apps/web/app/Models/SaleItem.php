<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleItem extends Model
{
    protected $fillable = ['sale_id', 'product_id', 'product_name', 'quantity_pieces', 'unit_price_cents', 'line_total_cents'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'sale_id' => 'integer',
            'product_id' => 'integer',
            'quantity_pieces' => 'integer',
            'unit_price_cents' => 'integer',
            'line_total_cents' => 'integer',
        ];
    }

    /** @return BelongsTo<Sale, $this> */
    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
