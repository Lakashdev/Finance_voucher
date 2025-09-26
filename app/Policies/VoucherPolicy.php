<?php

namespace App\Policies;

use App\Models\User;
use App\Models\JournalVoucher;

class VoucherPolicy
{
    /**
     * Supervisors can do EVERYTHING.
     * Returning true here short-circuits all other checks.
     */
    public function before(User $user, string $ability): ?bool
    {
        return $user->role === 'supervisor' ? true : null;
    }

    /** Anyone logged in can list / view (tweak if needed) */
    public function viewAny(User $user): bool { return true; }
    public function view(User $user, JournalVoucher $voucher): bool { return true; }

    /** Accountant can create */
    public function create(User $user): bool
    {
        return $user->role === 'accountant';
    }

    /** Accountant can update only own voucher when draft/rejected */
    public function update(User $user, JournalVoucher $voucher): bool
    {
        if ($user->role === 'accountant') return true;

        return ($voucher->created_by === $user->id)
            && in_array($voucher->status, [
                JournalVoucher::S_DRAFT,
                JournalVoucher::S_REJECTED,
            ], true);
    }

    /** Accountant can submit only own voucher when draft/rejected */
    public function submit(User $user, JournalVoucher $voucher): bool
    {
        if ($user->role === 'accountant') return true;

        return ($voucher->created_by === $user->id)
            && in_array($voucher->status, [
                JournalVoucher::S_DRAFT,
                JournalVoucher::S_REJECTED,
            ], true);
    }

    /** Approve/Reject: accountants never; supervisors already allowed via before() */
    public function approve(User $user, JournalVoucher $voucher): bool { return false; }
    public function reject(User $user, JournalVoucher $voucher): bool  { return false; }
}
