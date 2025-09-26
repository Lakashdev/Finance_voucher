<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VoucherEntry extends Model
{
    protected $table = 'voucher_entries';
    protected $guarded = [];

    // FK: voucher_entries.journal_voucher_id → journal_vouchers.id
    public function voucher()
    {
        return $this->belongsTo(JournalVoucher::class, 'journal_voucher_id');
    }

    // FK: voucher_entries.account_header_id → accounts.id
    public function account()
    {
        return $this->belongsTo(Account::class, 'account_header_id');
    }

    // Allocations where THIS entry is the debit side
    // FK: voucher_entry_allocations.debit_entry_id → voucher_entries.id
    public function allocationsAsDebit()
    {
        return $this->hasMany(VoucherEntryAllocation::class, 'debit_entry_id');
    }

    // Allocations where THIS entry is the credit side
    // FK: voucher_entry_allocations.credit_entry_id → voucher_entries.id
    public function allocationsAsCredit()
    {
        return $this->hasMany(VoucherEntryAllocation::class, 'credit_entry_id');
    }
}
