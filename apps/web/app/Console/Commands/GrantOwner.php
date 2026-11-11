<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Spatie\Permission\Models\Role;

class GrantOwner extends Command
{
    protected $signature = 'smartbaking:grant-owner {email : Existing registered account email}';

    protected $description = 'Grant the owner role to one explicitly selected account from the local server console';

    public function handle(): int
    {
        $user = User::query()->where('email', $this->argument('email'))->first();
        if (! $user) {
            $this->error('No account matches. Register the intended owner account first.');

            return self::FAILURE;
        }
        Role::findOrCreate('owner', 'web');
        $user->assignRole('owner');
        $this->info('Owner role granted. Email verification is still required to enter staff screens.');

        return self::SUCCESS;
    }
}
