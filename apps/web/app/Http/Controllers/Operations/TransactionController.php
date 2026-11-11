<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\ProductionBatch;
use App\Services\BakeryOperations;
use App\Services\BranchAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class TransactionController extends Controller
{
    public function __construct(private readonly BranchAccess $access, private readonly BakeryOperations $operations) {}

    private function branch(Request $request, string $action): Branch
    {
        $request->validate(['branch_id' => ['required', 'integer', 'min:1']]);
        $branch = $this->access->resolve($request->user(), (int) $request->input('branch_id'));
        abort_unless($branch !== null, 403);
        $this->access->authorize($request->user(), $branch, $action);

        return $branch;
    }

    public function receipt(Request $request): RedirectResponse
    {
        $branch = $this->branch($request, 'receive');
        $data = $request->validate([
            'ingredient_id' => ['required', 'integer', 'exists:ingredients,id'],
            'quantity_milli' => ['required', 'integer', 'min:1', 'max:1000000000000'],
            'reference' => ['nullable', 'string', 'max:120'],
            'request_key' => ['required', 'uuid'],
        ]);
        $this->operations->receiveIngredient($branch, $request->user(), $data);

        return $this->success('Receipt saved. Branch ingredient stock updated.', 'inventory', $branch);
    }

    public function plan(Request $request): RedirectResponse
    {
        $branch = $this->branch($request, 'produce');
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'batch_count' => ['required', 'integer', 'min:1', 'max:1000'],
            'request_key' => ['required', 'uuid'],
        ]);
        $this->operations->planProduction($branch, $request->user(), $data);

        return $this->success('Production planned with a pinned recipe. Ingredients are consumed when mixing starts.', 'production', $branch);
    }

    public function advance(Request $request, ProductionBatch $batch): RedirectResponse
    {
        $branch = $this->branch($request, 'produce');
        abort_unless($batch->branch_id === $branch->id, 404);
        $data = $request->validate([
            'status' => ['required', Rule::in(['mixing', 'baking', 'completed'])],
            'actual_pieces' => ['required_if:status,completed', 'nullable', 'integer', 'min:0', 'max:1000000000'],
        ]);
        $this->operations->advanceProduction($branch, $request->user(), $batch, $data);

        return $this->success('Batch stage saved.', 'production', $branch);
    }

    public function checkout(Request $request): RedirectResponse
    {
        $branch = $this->branch($request, 'sell');
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'items.*.quantity_pieces' => ['required', 'integer', 'min:1', 'max:1000000'],
            'cash_cents' => ['required', 'integer', 'min:0', 'max:1000000000000'],
            'request_key' => ['required', 'uuid'],
        ]);
        $sale = $this->operations->checkout($branch, $request->user(), $data);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Sale #{$sale->id} saved. Finished goods updated; ingredients are unchanged."]);

        return to_route('pos', ['branch' => $branch->id, 'receipt' => $sale->id]);
    }

    private function success(string $message, string $screen, Branch $branch): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return to_route($screen, ['branch' => $branch->id]);
    }
}
