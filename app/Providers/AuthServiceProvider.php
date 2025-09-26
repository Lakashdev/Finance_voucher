<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\User;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        // 'App\Models\Model' => 'App\Policies\ModelPolicy',
        \App\Models\JournalVoucher::class => \App\Policies\VoucherPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        /**
         * Gate: Only allow users with role "Main Supervisor"
         * to manage the user module (add, update, delete, view).
         */
        Gate::define('review-vouchers', fn($user) => $user->role === 'supervisor');
        Gate::define('manage-users', function (User $user) { $role = strtolower(trim((string) $user->role)); return $role === 'supervisor';});
        Gate::define('manage-accounts', fn($user) => $user->role === 'supervisor');
    }
}
