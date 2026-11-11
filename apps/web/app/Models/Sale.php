<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    protected $fillable = [
        'branch_id', 'request_key', 'payload_hash', 'subtotal_cents', 'total_cents',
        'cash_cents', 'change_cents', 'occurred_at', 'created_by',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'branch_id' => 'integer',
            'subtotal_cents' => 'integer',
            'total_cents' => 'integer',
            'cash_cents' => 'integer',
            'change_cents' => 'integer',
            'occurred_at' => 'datetime',
            'created_by' => 'integer',
        ];
    }

    /** @return BelongsTo<Branch, $this> */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /** @return HasMany<SaleItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
