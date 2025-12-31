<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TrialBalanceController extends Controller
{
    public function index(Request $r)
{
    $filters = $r->validate([
        'account_id' => ['nullable', 'integer'],
        'date_from'  => ['nullable', 'date'],
        'date_to'    => ['nullable', 'date'],
        'status'     => ['nullable', 'string'],
    ]);

    $baseQuery = DB::table('voucher_entries as ve')
        ->join('journal_vouchers as jv', 'jv.id', '=', 've.journal_voucher_id')
        ->join('accounts as a', 'a.id', '=', 've.account_header_id')
        ->when($filters['account_id'] ?? null, fn ($q, $v) => $q->where('a.id', $v))
        ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('jv.status', $v))
        ->where('jv.status', '!=', 'rejected')
        ->when($filters['date_from'] ?? null, fn ($q, $v) => $q->whereDate('jv.transaction_date', '>=', $v))
        ->when($filters['date_to'] ?? null, fn ($q, $v) => $q->whereDate('jv.transaction_date', '<=', $v));

    /* ---------- TABLE ROWS (paginated) ---------- */
    $rows = (clone $baseQuery)
        ->selectRaw('
            a.id as account_id,
            a.code,
            a.name,
            SUM(ve.debit)  as dr,
            SUM(ve.credit) as cr
        ')
        ->groupBy('a.id', 'a.code', 'a.name')
        ->orderBy('a.code')
        ->paginate(50)
        ->withQueryString();

    /* ---------- GRAND TOTALS (NOT paginated) ---------- */
    $totals = (clone $baseQuery)
        ->selectRaw('
            ROUND(SUM(ve.debit), 2)  as dr,
            ROUND(SUM(ve.credit), 2) as cr
        ')
        ->first();

    return Inertia::render('TrialBalance/Index', [
        'rows'    => $rows,
        'filters' => $filters,
        'totals'  => [
            'dr' => (float) ($totals->dr ?? 0),
            'cr' => (float) ($totals->cr ?? 0),
        ],
    ]);
}


 public function export(Request $r)
{
    $filters = $r->validate([
        'account_id' => ['nullable', 'integer'],
        'date_from'  => ['nullable', 'date'],
        'date_to'    => ['nullable', 'date'],
        'status'     => ['nullable', 'string'],
    ]);

    $baseQuery = DB::table('voucher_entries as ve')
        ->join('journal_vouchers as jv', 'jv.id', '=', 've.journal_voucher_id')
        ->join('accounts as a', 'a.id', '=', 've.account_header_id')
        ->when($filters['account_id'] ?? null, fn ($q, $v) => $q->where('a.id', $v))
        ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('jv.status', $v))
        ->where('jv.status', '!=', 'rejected')
        ->when($filters['date_from'] ?? null, fn ($q, $v) => $q->whereDate('jv.transaction_date', '>=', $v))
        ->when($filters['date_to'] ?? null, fn ($q, $v) => $q->whereDate('jv.transaction_date', '<=', $v));

    $rows = (clone $baseQuery)
        ->selectRaw('a.code, a.name, SUM(ve.debit) as dr, SUM(ve.credit) as cr')
        ->groupBy('a.code', 'a.name')
        ->orderBy('a.code')
        ->get();

    $totals = (clone $baseQuery)
        ->selectRaw('SUM(ve.debit) as dr, SUM(ve.credit) as cr')
        ->first();

    $filename = 'trial_balance_' . now()->format('Ymd_His') . '.csv';

    return response()->streamDownload(function () use ($rows, $totals) {
        $out = fopen('php://output', 'w');

        fputcsv($out, ['Code', 'Account', 'Debit', 'Credit', 'Balance Side', 'Balance']);

        foreach ($rows as $r) {
            $dr = (float) $r->dr;
            $cr = (float) $r->cr;
            $bal = abs($dr - $cr);

            fputcsv($out, [
                $r->code,
                $r->name,
                number_format($dr, 2, '.', ''),
                number_format($cr, 2, '.', ''),
                $bal == 0 ? '' : ($dr >= $cr ? 'DR' : 'CR'),
                number_format($bal, 2, '.', ''),
            ]);
        }

        /* ---------- TOTAL ROW ---------- */
        fputcsv($out, []);
        fputcsv($out, [
            '',
            'TOTAL',
            number_format((float)$totals->dr, 2, '.', ''),
            number_format((float)$totals->cr, 2, '.', ''),
            '',
            '',
        ]);

        fclose($out);
    }, $filename, ['Content-Type' => 'text/csv']);
}


    private function validateFilters(Request $r): array
    {
        // Keep it consistent with Entries filters style.
        // Adjust table/columns if your schema differs.
        $v = $r->validate([
            'account_id' => ['nullable', 'integer'],
            'date_from'  => ['nullable', 'date'],
            'date_to'    => ['nullable', 'date'],
            'status'     => ['nullable', 'string'], // draft/submitted/approved/rejected
        ]);

        // normalize empty strings
        foreach ($v as $k => $val) {
            if ($val === '') $v[$k] = null;
        }

        return [
            'account_id' => $v['account_id'] ?? null,
            'date_from'  => $v['date_from'] ?? null,
            'date_to'    => $v['date_to'] ?? null,
            'status'     => $v['status'] ?? null,
        ];
    }

    private function baseQuery(array $filters)
    {
        // IMPORTANT: adjust table names/columns to match your schema.
        // I’m assuming:
        // - voucher_entries table has: id, journal_voucher_id, account_header_id, debit, credit
        // - journal_vouchers table has: id, transaction_date, status
        // - accounts table has: id, code, name
        return DB::table('voucher_entries as ve')
            ->join('journal_vouchers as jv', 'jv.id', '=', 've.journal_voucher_id')
            ->join('accounts as a', 'a.id', '=', 've.account_header_id')
            ->when($filters['account_id'], fn ($q) => $q->where('a.id', $filters['account_id']))
            ->when($filters['status'], fn ($q) => $q->where('jv.status', $filters['status']))
            ->when($filters['date_from'], fn ($q) => $q->whereDate('jv.transaction_date', '>=', $filters['date_from']))
            ->when($filters['date_to'], fn ($q) => $q->whereDate('jv.transaction_date', '<=', $filters['date_to']));
    }

    private function queryTrialBalance(array $filters)
    {
        return $this->baseQuery($filters)
            ->selectRaw('a.id as account_id, a.code, a.name, SUM(ve.debit) as dr, SUM(ve.credit) as cr')
            ->groupBy('a.id', 'a.code', 'a.name')
            ->orderBy('a.code');
    }

    private function queryTrialBalanceTotals(array $filters): array
    {
        $x = $this->queryTrialBalance($filters)->get();

        $dr = round($x->sum(fn ($r) => (float)$r->dr), 2);
        $cr = round($x->sum(fn ($r) => (float)$r->cr), 2);

        return ['dr' => $dr, 'cr' => $cr];
    }
}
