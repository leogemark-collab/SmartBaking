<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $branch_id
 * @property int $product_id
 * @property Carbon $interval_start
 * @property int $interval_minutes
 * @property int|null $quantity_pieces
 * @property int|null $revenue_cents
 * @property string $status
 * @property string $source_reference
 */
class SalesObservation extends Model
{
    protected $fillable = [
        'branch_id', 'product_id', 'interval_start', 'interval_minutes',
        'quantity_pieces', 'revenue_cents', 'status', 'source_reference',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'branch_id' => 'integer',
            'product_id' => 'integer',
            'interval_start' => 'datetime',
            'interval_minutes' => 'integer',
            'quantity_pieces' => 'integer',
            'revenue_cents' => 'integer',
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
}
