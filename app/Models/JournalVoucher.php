<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\VoucherEntry;

class JournalVoucher extends Model
{

    public const S_DRAFT     = 'draft';
    public const S_SUBMITTED = 'submitted';
    public const S_APPROVED  = 'approved';
    public const S_REJECTED  = 'rejected';

    protected $fillable = [
  'jv_number','transaction_date','status','narration',
  'prepared_by','checked_by','reject_reason',
  'created_by','updated_by',
];
    protected $casts = ['transaction_date' => 'date'];

    // Default to draft if not set
    protected $attributes = [
        'status' => self::S_DRAFT,
    ];

    public function lines(){return $this->hasMany(\App\Models\VoucherEntry::class, 'journal_voucher_id');}

    public function creator()   { return $this->belongsTo(User::class, 'created_by'); }
    public function approver()  { return $this->belongsTo(User::class, 'approved_by'); }
    public function preparedBy()  { return $this->belongsTo(User::class, 'prepared_by'); }
    public function checkedBy()   { return $this->belongsTo(User::class, 'checked_by'); }
}
