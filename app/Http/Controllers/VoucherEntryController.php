<?php

namespace App\Http\Controllers;

use App\Models\VoucherEntry;
use App\Models\VoucherEntryAllocation;
use App\Models\Account;
use Illuminate\Http\Request;
use Inertia\Inertia;

class VoucherEntryController extends Controller
{
   public function index(Request $r)
{
    // ---- Collect & normalize filters ----
    $filters = [
        'q'          => trim((string) $r->q),
        'account_id' => $r->account_id ?: null,
        'side'       => in_array($r->side, ['dr','cr'], true) ? $r->side : null,

        // ✅ do NOT accept "rejected" as a filter (we always exclude it)
        'status'     => in_array($r->status, ['draft','submitted','approved'], true) ? $r->status : null,

        'date_from'  => $r->date_from ?: null,
        'date_to'    => $r->date_to ?: null,
        'min'        => is_numeric($r->min) ? $r->min : null,
        'max'        => is_numeric($r->max) ? $r->max : null,
    ];

    // ---- Base filtered query ----
    $filtered = VoucherEntry::query()
        // direct filters on entries
        ->when($filters['account_id'], fn($q) =>
            $q->where('account_header_id', $filters['account_id'])
        )
        ->when($filters['side'] === 'dr', fn($q) => $q->where('debit', '>', 0))
        ->when($filters['side'] === 'cr', fn($q) => $q->where('credit', '>', 0))
        ->when($filters['min'] !== null, fn($q) =>
            $q->whereRaw('(CASE WHEN debit > 0 THEN debit ELSE credit END) >= ?', [$filters['min']])
        )
        ->when($filters['max'] !== null, fn($q) =>
            $q->whereRaw('(CASE WHEN debit > 0 THEN debit ELSE credit END) <= ?', [$filters['max']])
        )

        // ✅ voucher filters + ALWAYS exclude rejected
        ->whereHas('voucher', function ($w) use ($filters) {

            // ✅ hard exclude rejected ALWAYS
            $w->where('status', '!=', 'rejected');

            // optional status filter (only non-rejected due to normalization)
            $w->when($filters['status'], fn($qq) => $qq->where('status', $filters['status']))

              ->when($filters['date_from'], fn($qq) =>
                  $qq->whereDate('transaction_date', '>=', $filters['date_from'])
              )
              ->when($filters['date_to'], fn($qq) =>
                  $qq->whereDate('transaction_date', '<=', $filters['date_to'])
              )
              ->when($filters['q'], fn($qq) => $qq->where(function ($x) use ($filters) {
                  $x->where('jv_number', 'ilike', '%'.$filters['q'].'%')
                    ->orWhere('narration', 'ilike', '%'.$filters['q'].'%');
              }));
        });

    // ---- Totals for ENTIRE filtered set ----
    $totals = (clone $filtered)
        ->selectRaw('COALESCE(SUM(debit),0) AS dr, COALESCE(SUM(credit),0) AS cr')
        ->first();

    // ---- Paginated list ----
    $entries = (clone $filtered)
        ->with([
            'voucher:id,jv_number,transaction_date,status,narration',
            'account:id,code,name',
        ])
        ->orderByDesc('id')
        ->paginate(25)
        ->withQueryString();

    // ---- Load allocations for entries on this page and attach as "associates" ----
    $entryIds = $entries->getCollection()->pluck('id')->all();
    if (!empty($entryIds)) {
        $allocations = VoucherEntryAllocation::query()
            ->where(function ($q) use ($entryIds) {
                $q->whereIn('debit_entry_id', $entryIds)
                  ->orWhereIn('credit_entry_id', $entryIds);
            })
            ->with([
                'debitEntry:id,account_header_id,debit,credit',
                'debitEntry.account:id,code,name',
                'creditEntry:id,account_header_id,debit,credit',
                'creditEntry.account:id,code,name',
            ])
            ->get();

        $assocMap = [];
        foreach ($allocations as $a) {
            $d = $a->debitEntry;
            $c = $a->creditEntry;
            if ($d && $c) {
                $assocMap[$d->id][] = [
                    'side'    => 'cr',
                    'amount'  => (float) $a->amount,
                    'entry_id'=> $c->id,
                    'account' => [
                        'id'   => $c->account?->id,
                        'name' => $c->account?->name,
                        'code' => $c->account?->code,
                    ],
                ];
                $assocMap[$c->id][] = [
                    'side'    => 'dr',
                    'amount'  => (float) $a->amount,
                    'entry_id'=> $d->id,
                    'account' => [
                        'id'   => $d->account?->id,
                        'name' => $d->account?->name,
                        'code' => $d->account?->code,
                    ],
                ];
            }
        }

        $entries->setCollection(
            $entries->getCollection()->map(function ($e) use ($assocMap) {
                $e->associates = array_values($assocMap[$e->id] ?? []);
                return $e;
            })
        );
    }

    $accounts = Account::orderBy('name')->get(['id','code','name']);

    return Inertia::render('Entries/Index', [
        'entries'  => $entries,
        'accounts' => $accounts,
        'filters'  => $filters,
        'totals'   => [
            'dr' => (float) ($totals->dr ?? 0),
            'cr' => (float) ($totals->cr ?? 0),
        ],
    ]);
}


   public function export(Request $r)
{
    $filters = [
        'q'          => trim((string) $r->q),
        'account_id' => $r->account_id ?: null,
        'side'       => in_array($r->side, ['dr','cr'], true) ? $r->side : null,

        // ✅ reject "rejected" filter input
        'status'     => in_array($r->status, ['draft','submitted','approved'], true) ? $r->status : null,

        'date_from'  => $r->date_from ?: null,
        'date_to'    => $r->date_to ?: null,
        'min'        => is_numeric($r->min) ? $r->min : null,
        'max'        => is_numeric($r->max) ? $r->max : null,
    ];

    $filtered = VoucherEntry::query()
        ->when($filters['account_id'], fn($q) =>
            $q->where('account_header_id', $filters['account_id'])
        )
        ->when($filters['side'] === 'dr', fn($q) => $q->where('debit', '>', 0))
        ->when($filters['side'] === 'cr', fn($q) => $q->where('credit', '>', 0))
        ->when($filters['min'] !== null, fn($q) =>
            $q->whereRaw('(CASE WHEN debit > 0 THEN debit ELSE credit END) >= ?', [$filters['min']])
        )
        ->when($filters['max'] !== null, fn($q) =>
            $q->whereRaw('(CASE WHEN debit > 0 THEN debit ELSE credit END) <= ?', [$filters['max']])
        )
        ->whereHas('voucher', function ($w) use ($filters) {

            // ✅ hard exclude rejected ALWAYS
            $w->where('status', '!=', 'rejected');

            $w->when($filters['status'], fn($qq) => $qq->where('status', $filters['status']))
              ->when($filters['date_from'], fn($qq) => $qq->whereDate('transaction_date', '>=', $filters['date_from']))
              ->when($filters['date_to'], fn($qq) => $qq->whereDate('transaction_date', '<=', $filters['date_to']))
              ->when($filters['q'], fn($qq) => $qq->where(function ($x) use ($filters) {
                  $x->where('jv_number', 'ilike', '%'.$filters['q'].'%')
                    ->orWhere('narration', 'ilike', '%'.$filters['q'].'%');
              }));
        });

    $query = (clone $filtered)
        ->with([
            'voucher:id,jv_number,transaction_date,status,narration',
            'account:id,code,name',
            'allocationsAsDebit.creditEntry:id,journal_voucher_id,account_header_id,debit,credit',
            'allocationsAsDebit.creditEntry.account:id,code,name',
            'allocationsAsCredit.debitEntry:id,journal_voucher_id,account_header_id,debit,credit',
            'allocationsAsCredit.debitEntry.account:id,code,name',
        ])
        ->orderBy('id');

    $filename = 'voucher-entries-'.now()->format('Ymd-His').'.csv';

    $handle = fopen('php://temp', 'w+');

    fputcsv($handle, [
        'Date','JV No.','Account Code','Account Name','Side','Amount','Narration','Status','Associates',
    ]);

    $query->chunkById(1000, function ($chunk) use ($handle) {
        foreach ($chunk as $e) {
            $side   = $e->debit > 0 ? 'DR' : 'CR';
            $amount = $e->debit > 0 ? $e->debit : $e->credit;

            if ($side === 'DR') {
                $parts = [];
                foreach ($e->allocationsAsDebit as $al) {
                    $ce = $al->creditEntry;
                    if (!$ce) continue;
                    $acc = $ce->account;
                    $label = $acc ? "{$acc->name} ({$acc->code})" : 'Credit line';
                    $parts[] = "{$label}: ".number_format((float)$al->amount, 2, '.', '');
                }
                $assoc = implode(' | ', $parts);
            } else {
                $parts = [];
                foreach ($e->allocationsAsCredit as $al) {
                    $de = $al->debitEntry;
                    if (!$de) continue;
                    $acc = $de->account;
                    $label = $acc ? "{$acc->name} ({$acc->code})" : 'Debit line';
                    $parts[] = "{$label}: ".number_format((float)$al->amount, 2, '.', '');
                }
                $assoc = implode(' | ', $parts);
            }

            fputcsv($handle, [
                optional($e->voucher)->transaction_date,
                optional($e->voucher)->jv_number,
                optional($e->account)->code,
                optional($e->account)->name,
                $side,
                number_format((float)$amount, 2, '.', ''),
                optional($e->voucher)->narration,
                optional($e->voucher)->status,
                $assoc,
            ]);
        }
    });

    rewind($handle);
    $csv = stream_get_contents($handle);
    fclose($handle);

    return response($csv, 200, [
        'Content-Type'        => 'text/csv; charset=UTF-8',
        'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        'Cache-Control'       => 'no-store, no-cache, must-revalidate',
        'Pragma'              => 'no-cache',
    ]);
}

}
