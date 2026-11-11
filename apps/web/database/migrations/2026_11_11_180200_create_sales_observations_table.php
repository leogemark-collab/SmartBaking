<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Historical aggregates are deliberately separate from live sales/stock.
        Schema::create('sales_observations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->dateTime('interval_start'); // Canonical UTC, no implicit local dates.
            $table->unsignedSmallInteger('interval_minutes');
            $table->unsignedBigInteger('quantity_pieces')->nullable();
            $table->unsignedBigInteger('revenue_cents')->nullable();
            $table->enum('status', ['observed', 'closed', 'stockout', 'missing']);
            $table->string('source_reference', 120);
            $table->timestamps();

            $table->unique(['branch_id', 'product_id', 'interval_start', 'interval_minutes'], 'sales_observations_interval_unique');
            $table->unique(['branch_id', 'source_reference'], 'sales_observations_source_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_observations');
    }
};
