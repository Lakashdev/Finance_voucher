<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\VoucherEntry;

class Account extends Model
{
    use HasFactory;

    /** Mass-assignable columns (works with create()/update()) */
    protected $fillable = ['code', 'name', 'type', 'active'];

    /** Casts */
    protected $casts = [
        'active' => 'boolean',
    ];

    /** Allowed account types (use for validation/UI) */
    public const TYPES = ['asset','liability','equity','income','expense'];

    /* -------------------- Accessors / Mutators -------------------- */

    public function setCodeAttribute($value): void
    {
        $this->attributes['code'] = trim((string) $value);
    }

    public function setNameAttribute($value): void
    {
        $this->attributes['name'] = trim((string) $value);
    }

    /** Handy label for dropdowns: "25 — Refreshments" */
    public function getLabelAttribute(): string
    {
        return "{$this->code} — {$this->name}";
    }

    /* --------------------------- Scopes --------------------------- */

    /** Filter to active accounts */
    public function scopeActive($q)
    {
        return $q->where('active', true);
    }

    /** Filter by type (asset/liability/...) */
    public function scopeType($q, ?string $type)
    {
        return $type ? $q->where('type', $type) : $q;
    }

    /** Case-insensitive search by name or code (Postgres ILIKE) */
    public function scopeSearch($q, ?string $term)
    {
        if (!$term) return $q;
        $term = trim($term);
        return $q->where(function ($w) use ($term) {
            $w->where('name', 'ilike', "%{$term}%")
              ->orWhere('code', 'ilike', "%{$term}%");
        });
    }




    public function entries()
    {
        return $this->hasMany(VoucherEntry::class, 'account_id');
    }

}
