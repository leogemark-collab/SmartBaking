<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class BranchAccess
{
    public function isOwner(User $user): bool
    {
        return $user->hasAnyRole(['owner', 'administrator']);
    }

    /** @return Collection<int, Branch> */
    public function available(User $user): Collection
    {
        $query = Branch::query()->where('active', true)->orderBy('name');
        if (! $this->isOwner($user)) {
            $query->whereIn('id', DB::table('branch_user')->where('user_id', $user->id)->select('branch_id'));
        }

        return $query->get();
    }

    public function resolve(User $user, ?int $id): ?Branch
    {
        $branches = $this->available($user);
        if ($id !== null) {
            $branch = $branches->firstWhere('id', $id);
            abort_unless($branch !== null, 403, 'You do not have access to this branch.');

            return $branch;
        }

        return $branches->first();
    }

    public function can(User $user, ?Branch $branch, string $action): bool
    {
        if ($this->isOwner($user)) {
            return $branch === null ? in_array($action, ['catalog', 'team'], true) : (bool) $branch->active;
        }
        if ($branch === null || ! $branch->active) {
            return false;
        }
        $role = DB::table('branch_user')->where('branch_id', $branch->id)->where('user_id', $user->id)->value('role');

        return match ($action) {
            'read' => in_array($role, ['cashier', 'baker', 'supervisor'], true),
            'sell' => in_array($role, ['cashier', 'supervisor'], true),
            'produce' => in_array($role, ['baker', 'supervisor'], true),
            'receive' => $role === 'supervisor',
            default => false,
        };
    }

    public function authorize(User $user, ?Branch $branch, string $action): void
    {
        abort_unless($this->can($user, $branch, $action), 403, 'Your role does not permit this action.');
    }

    public function canBootstrap(): bool
    {
        return (bool) config('smartbaking.allow_initial_setup')
            && DB::table('installation_state')->where('id', 1)->whereNull('initialized_by')->exists()
            && ! Branch::query()->exists()
            && ! User::query()->whereHas('roles', fn ($query) => $query->whereIn('name', ['owner', 'administrator']))->exists();
    }
}
