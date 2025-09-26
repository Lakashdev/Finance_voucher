<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VoucherEntryAllocation extends Model
{
    protected $table = 'voucher_entry_allocations';

    // adjust if you use guarded instead
    protected $fillable = [
        'journal_voucher_id',   // keep if this column exists in your table
        'debit_entry_id',
        'credit_entry_id',
        'amount',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    /** The debit-side entry for this allocation */
    public function debitEntry()
    {
        return $this->belongsTo(VoucherEntry::class, 'debit_entry_id');
    }

    /** The credit-side entry for this allocation */
    public function creditEntry()
    {
        return $this->belongsTo(VoucherEntry::class, 'credit_entry_id');
    }

    /** (Optional) the parent voucher if you store journal_voucher_id on this table */
    public function voucher()
    {
        return $this->belongsTo(JournalVoucher::class, 'journal_voucher_id');
    }
}
