<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Models\Ingredient;
use App\Models\IngredientStock;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\Recipe;
use App\Models\RecipeItem;
use App\Services\BranchAccess;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class WorkspaceController extends Controller
{
    public function __construct(private readonly BranchAccess $access) {}

    public function __invoke(Request $request): Response
    {
        $data = $request->validate([
            'branch' => ['nullable', 'integer', 'min:1'],
            'receipt' => ['nullable', 'integer', 'min:1'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d'],
        ]);
        $user = $request->user();
        $branch = $this->access->resolve($user, isset($data['branch']) ? (int) $data['branch'] : null);
        $owner = $this->access->isOwner($user);
        $timezone = $branch->timezone ?? 'Asia/Manila';
        $from = CarbonImmutable::parse($data['from'] ?? CarbonImmutable::now($timezone)->toDateString(), $timezone)->startOfDay();
        $to = CarbonImmutable::parse($data['to'] ?? $from->toDateString(), $timezone)->startOfDay();
        if ($to < $from || $from->diffInDays($to) > 365) {
            throw ValidationException::withMessages(['from' => 'Choose an ordered date range of at most 366 days.']);
        }
        $start = $from->utc();
        $end = $to->addDay()->utc();
        $branchId = $branch?->id;
        $sales = DB::table('sales')->where('branch_id', $branchId)->where('occurred_at', '>=', $start)->where('occurred_at', '<', $end);
        $stocks = ProductStock::query()->where('branch_id', $branchId)->get()->keyBy('product_id');
        $ingredientStocks = IngredientStock::query()->where('branch_id', $branchId)->get()->keyBy('ingredient_id');
        $visibleCatalog = $owner || $branch !== null;
        $products = $visibleCatalog ? Product::query()->orderBy('name')->limit(500)->get()->map(fn (Product $product) => [
            'id' => $product->id, 'sku' => $product->sku, 'name' => $product->name, 'category' => $product->category,
            'price_cents' => $product->price_cents, 'active' => $product->active, 'current_recipe_id' => $product->current_recipe_id,
            'available_pieces' => $stocks->get($product->id)->quantity_pieces ?? 0,
        ])->values()->all() : [];
        $ingredients = $visibleCatalog ? Ingredient::query()->orderBy('name')->limit(500)->get()->map(fn (Ingredient $item) => [
            'id' => $item->id, 'code' => $item->code, 'name' => $item->name, 'unit' => $item->unit, 'active' => $item->active,
            'quantity_milli' => $ingredientStocks->get($item->id)->quantity_milli ?? 0,
            'safety_milli' => $ingredientStocks->get($item->id)->safety_milli ?? 0,
            'lead_days' => $ingredientStocks->get($item->id)->lead_days ?? 0,
            'pack_milli' => $ingredientStocks->get($item->id)->pack_milli ?? 1000,
        ])->values()->all() : [];
        $recipeRows = $visibleCatalog ? Recipe::query()->with('items.ingredient')->whereIn('id', array_filter(array_column($products, 'current_recipe_id')))->get() : collect();
        $recipes = $recipeRows->map(function (Recipe $recipe) use ($products): array {
            $product = collect($products)->firstWhere('id', $recipe->product_id);

            return [
                'id' => $recipe->id, 'product_id' => $recipe->product_id, 'product_name' => $product['name'] ?? '',
                'version' => $recipe->version, 'yield_pieces' => $recipe->yield_pieces,
                'items' => $recipe->items->map(function (RecipeItem $item): array {
                    $ingredient = $item->ingredient;

                    return ['ingredient_id' => $ingredient->id, 'name' => $ingredient->name, 'unit' => $ingredient->unit, 'quantity_milli' => $item->quantity_milli];
                })->values()->all(),
            ];
        })->values()->all();
        $checkoutReceipt = null;
        if (isset($data['receipt'])) {
            $receipt = DB::table('sales')->where('branch_id', $branchId)->where('id', $data['receipt'])->first();
            abort_unless($receipt !== null, 404);
            $checkoutReceipt = [
                'id' => $receipt->id, 'total_cents' => $receipt->total_cents,
                'cash_cents' => $receipt->cash_cents, 'change_cents' => $receipt->change_cents,
                'occurred_at' => CarbonImmutable::parse($receipt->occurred_at, 'UTC')->toIso8601String(),
                'items' => DB::table('sale_items')->where('sale_id', $receipt->id)->get(['product_name', 'quantity_pieces', 'unit_price_cents', 'line_total_cents']),
            ];
        }
        $saleRows = (clone $sales)->orderByDesc('occurred_at')->orderByDesc('id')->limit(50)->get();
        $saleItems = DB::table('sale_items')->whereIn('sale_id', $saleRows->pluck('id'))->get(['sale_id', 'product_name', 'quantity_pieces', 'unit_price_cents', 'line_total_cents'])->groupBy('sale_id');
        $batches = DB::table('production_batches as batches')
            ->join('products', 'products.id', '=', 'batches.product_id')->join('recipes', 'recipes.id', '=', 'batches.recipe_id')
            ->where('batches.branch_id', $branchId)->select('batches.*', 'products.name as product_name', 'recipes.version as recipe_version')
            ->orderByDesc('batches.id')->limit(50)->get();
        $movements = DB::table('stock_movements as movements')
            ->leftJoin('ingredients', 'ingredients.id', '=', 'movements.ingredient_id')->leftJoin('products', 'products.id', '=', 'movements.product_id')
            ->where('movements.branch_id', $branchId)
            ->select('movements.*')->selectRaw("COALESCE(ingredients.name, products.name) as item_name, COALESCE(ingredients.unit, 'pcs') as unit")
            ->orderByDesc('movements.id')->limit(50)->get();
        $observations = DB::table('sales_observations')->where('branch_id', $branchId);

        return Inertia::render('operations/workspace', [
            'preview' => false, 'mode' => 'live', 'screen' => $request->route()->getName(),
            'checkoutReceipt' => $checkoutReceipt,
            'availableBranches' => $this->access->available($user)->map(fn ($item) => $item->only(['id', 'code', 'name', 'can_produce']))->values()->all(),
            'currentBranch' => $branch?->only(['id', 'code', 'name', 'can_produce']),
            'capabilities' => [
                'manage_catalog' => $owner, 'manage_team' => $owner,
                'manage_stock' => $this->access->can($user, $branch, 'receive'),
                'produce' => $branch !== null && $branch->can_produce && $this->access->can($user, $branch, 'produce'),
                'sell' => $this->access->can($user, $branch, 'sell'), 'can_bootstrap' => $this->access->canBootstrap(),
            ],
            'catalog' => ['products' => $products, 'ingredients' => $ingredients, 'recipes' => $recipes],
            'records' => [
                'batches' => $batches->map(fn ($batch) => [...(array) $batch,
                    'created_at' => CarbonImmutable::parse($batch->created_at, 'UTC')->toIso8601String(),
                    'started_at' => $batch->started_at ? CarbonImmutable::parse($batch->started_at, 'UTC')->toIso8601String() : null,
                    'completed_at' => $batch->completed_at ? CarbonImmutable::parse($batch->completed_at, 'UTC')->toIso8601String() : null,
                ])->values(),
                'sales' => $saleRows->map(function ($sale) use ($saleItems): array {
                    return [
                        'id' => $sale->id, 'total_cents' => $sale->total_cents, 'cash_cents' => $sale->cash_cents, 'change_cents' => $sale->change_cents,
                        'occurred_at' => CarbonImmutable::parse($sale->occurred_at, 'UTC')->toIso8601String(),
                        'items' => $saleItems->get($sale->id, collect())->values(),
                    ];
                })->values(),
                'movements' => $movements->map(fn ($movement) => [...(array) $movement, 'created_at' => CarbonImmutable::parse($movement->created_at, 'UTC')->toIso8601String()])->values(),
                'memberships' => $owner && $branch ? DB::table('branch_user')->join('users', 'users.id', '=', 'branch_user.user_id')->where('branch_id', $branchId)->get(['users.id', 'users.name', 'users.email', 'branch_user.role']) : [],
            ],
            'summary' => [
                'sales_cents' => (int) (clone $sales)->sum('total_cents'), 'sale_count' => (clone $sales)->count(),
                'produced_pieces' => (int) DB::table('production_batches')->where('branch_id', $branchId)->where('status', 'completed')->where('completed_at', '>=', $start)->where('completed_at', '<', $end)->sum('actual_pieces'),
                'ingredient_count' => $ingredientStocks->count(),
            ],
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString(), 'timezone' => $timezone],
            'dataReadiness' => [
                'observation_count' => (clone $observations)->count(),
                'observed_count' => (clone $observations)->where('status', 'observed')->count(),
                'stockout_count' => (clone $observations)->where('status', 'stockout')->count(),
                'missing_count' => (clone $observations)->where('status', 'missing')->count(),
                'first_at' => (clone $observations)->min('interval_start'), 'last_at' => (clone $observations)->max('interval_start'),
            ],
        ]);
    }
}
