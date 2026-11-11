<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('installation_state', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->primary();
            $table->foreignId('initialized_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('initialized_at')->nullable();
        });
        DB::table('installation_state')->insert(['id' => 1]);
    }

    public function down(): void
    {
        Schema::dropIfExists('installation_state');
    }
};
