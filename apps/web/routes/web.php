<?php

use App\Http\Controllers\Operations\CatalogController;
use App\Http\Controllers\Operations\TransactionController;
use App\Http\Controllers\Operations\WorkspaceController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::inertia('/', 'welcome')->name('home');

Route::inertia('/preview', 'workspace/dashboard', ['preview' => true])->name('preview');

Route::get('/preview/{screen}', function (string $screen) {
    return Inertia::render('workspace/'.$screen, ['preview' => true]);
})->whereIn('screen', ['dashboard', 'pos', 'production', 'inventory', 'forecasts', 'transfers', 'team', 'reports'])
    ->name('preview.screen');

Route::middleware(['auth', 'verified'])->group(function () {
    foreach (['dashboard', 'pos', 'production', 'inventory', 'forecasts', 'transfers', 'team', 'reports', 'setup'] as $screen) {
        Route::get($screen, WorkspaceController::class)->name($screen);
    }
    Route::prefix('operations')->name('operations.')->middleware('throttle:120,1')->group(function () {
        Route::post('bootstrap', [CatalogController::class, 'bootstrap'])->name('bootstrap');
        Route::post('branches', [CatalogController::class, 'branch'])->name('branches');
        Route::post('products', [CatalogController::class, 'product'])->name('products');
        Route::post('ingredients', [CatalogController::class, 'ingredient'])->name('ingredients');
        Route::post('recipes', [CatalogController::class, 'recipe'])->name('recipes');
        Route::post('memberships', [CatalogController::class, 'membership'])->name('memberships');
        Route::post('receipts', [TransactionController::class, 'receipt'])->name('receipts');
        Route::post('production', [TransactionController::class, 'plan'])->name('production');
        Route::patch('production/{batch}', [TransactionController::class, 'advance'])->name('production.advance');
        Route::post('sales', [TransactionController::class, 'checkout'])->name('sales');
    });
});

require __DIR__.'/settings.php';
