<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Ingredient;
use App\Models\Product;
use App\Models\Recipe;
use App\Models\RecipeItem;
use App\Models\User;
use App\Services\BranchAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class CatalogController extends Controller
{
    public function __construct(private readonly BranchAccess $access) {}

    /** @return array<string, mixed> */
    private function branchData(Request $request): array
    {
        return $request->validate([
            'code' => ['required', 'string', 'max:32', 'regex:/^[A-Z0-9][A-Z0-9_-]{0,31}$/', 'unique:branches,code'],
            'name' => ['required', 'string', 'max:120'],
            'can_produce' => ['sometimes', 'boolean'],
        ]) + ['can_produce' => true, 'timezone' => 'Asia/Manila', 'active' => true];
    }

    public function bootstrap(Request $request): RedirectResponse
    {
        abort_unless(config('smartbaking.allow_initial_setup'), 403, 'Initial web setup is disabled. Initialize the owner from the server console.');
        $data = $this->branchData($request);
        $user = $request->user();
        DB::transaction(function () use ($data, $user): void {
            // The write claims a single shared row before checking catalog/owner state,
            // including on SQLite where SELECT FOR UPDATE does not lock a row.
            $claimed = DB::table('installation_state')->where('id', 1)->whereNull('initialized_by')->update([
                'initialized_by' => $user->id, 'initialized_at' => now(),
            ]);
            if ($claimed !== 1 || Branch::query()->exists() || User::query()->whereHas('roles', fn ($q) => $q->whereIn('name', ['owner', 'administrator']))->exists()) {
                throw ValidationException::withMessages(['setup' => 'Initial setup is already complete. Ask the owner for branch access.']);
            }
            Role::findOrCreate('owner', 'web');
            $user->assignRole('owner');
            $branch = Branch::query()->create($data);
            DB::table('branch_user')->insert(['branch_id' => $branch->id, 'user_id' => $user->id, 'role' => 'supervisor', 'created_at' => now(), 'updated_at' => now()]);
        }, 5);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Owner setup complete. Your branch is ready for its catalog.']);

        return to_route('setup');
    }

    public function branch(Request $request): RedirectResponse
    {
        $this->access->authorize($request->user(), null, 'catalog');
        $branch = Branch::query()->create($this->branchData($request));

        return $this->success('Branch created.', $branch->id);
    }

    public function product(Request $request): RedirectResponse
    {
        $this->access->authorize($request->user(), null, 'catalog');
        $data = $request->validate([
            'sku' => ['required', 'string', 'max:40', 'regex:/^[A-Z0-9][A-Z0-9_-]{0,39}$/', 'unique:products,sku'],
            'name' => ['required', 'string', 'max:160'],
            'category' => ['nullable', 'string', 'max:80'],
            'price_cents' => ['required', 'integer', 'min:0', 'max:100000000'],
        ]);
        Product::query()->create($data + ['active' => true]);

        return $this->success('Product created. Add a recipe to enable production.');
    }

    public function ingredient(Request $request): RedirectResponse
    {
        $this->access->authorize($request->user(), null, 'catalog');
        $data = $request->validate([
            'code' => ['required', 'string', 'max:40', 'regex:/^[A-Z0-9][A-Z0-9_-]{0,39}$/', 'unique:ingredients,code'],
            'name' => ['required', 'string', 'max:160'],
            'unit' => ['required', Rule::in(['kg', 'L', 'pcs'])],
        ]);
        Ingredient::query()->create($data + ['active' => true]);

        return $this->success('Ingredient created. Branch stock starts at zero.');
    }

    public function recipe(Request $request): RedirectResponse
    {
        $this->access->authorize($request->user(), null, 'catalog');
        $data = $request->validate([
            'product_id' => ['required', 'integer', Rule::exists('products', 'id')->where('active', true)],
            'yield_pieces' => ['required', 'integer', 'min:1', 'max:1000000'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.ingredient_id' => ['required', 'integer', 'distinct', Rule::exists('ingredients', 'id')->where('active', true)],
            'items.*.quantity_milli' => ['required', 'integer', 'min:1', 'max:1000000000'],
        ]);
        foreach ($data['items'] as $index => $item) {
            if (Ingredient::query()->whereKey($item['ingredient_id'])->firstOrFail()->unit === 'pcs' && $item['quantity_milli'] % 1000 !== 0) {
                throw ValidationException::withMessages(["items.$index.quantity_milli" => 'Ingredients counted in pieces require whole pieces.']);
            }
        }
        DB::transaction(function () use ($data): void {
            Product::query()->whereKey($data['product_id'])->update(['updated_at' => now()]);
            $product = Product::query()->whereKey($data['product_id'])->lockForUpdate()->firstOrFail();
            $version = (int) Recipe::query()->where('product_id', $product->id)->max('version') + 1;
            $recipe = Recipe::query()->create(['product_id' => $product->id, 'version' => $version, 'yield_pieces' => $data['yield_pieces']]);
            foreach ($data['items'] as $item) {
                RecipeItem::query()->create(['recipe_id' => $recipe->id, ...$item]);
            }
            $product->update(['current_recipe_id' => $recipe->id]);
        }, 5);

        return $this->success('New recipe version saved. Existing batches keep their pinned requirements.');
    }

    public function membership(Request $request): RedirectResponse
    {
        $this->access->authorize($request->user(), null, 'team');
        $data = $request->validate([
            'branch_id' => ['required', 'integer', Rule::exists('branches', 'id')->where('active', true)],
            'email' => ['required', 'string', 'email', 'max:255'],
            'role' => ['required', Rule::in(['cashier', 'baker', 'supervisor'])],
        ]);
        $user = User::query()->where('email', $data['email'])->first();
        if (! $user || ! $user->hasVerifiedEmail()) {
            throw ValidationException::withMessages(['email' => 'Staff must register and verify this email before branch access can be granted.']);
        }
        $branch = Branch::query()->whereKey($data['branch_id'])->firstOrFail();
        $branch->users()->syncWithoutDetaching([$user->id => ['role' => $data['role']]]);

        return $this->success('Staff branch access saved.', (int) $data['branch_id']);
    }

    private function success(string $message, ?int $branch = null): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return to_route('setup', $branch ? ['branch' => $branch] : []);
    }
}
