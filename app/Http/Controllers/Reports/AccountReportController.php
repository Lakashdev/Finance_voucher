<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Models\Account; // adjust namespace if different

class AccountReportController extends Controller
{
    //
 public function show(Account $account, Request $request)
    {
        $veTable   = 'public.voucher_entries';
        $fkCol     = 'account_header_id'; // <-- your FK
        $dateCol   = 'created_at';        // <-- change if you have a better date column
        $debitCol  = 'debit';
        $creditCol = 'credit';

        // Years available for this account header (from entries)
        $years = DB::table("$veTable as ve")
            ->where("ve.$fkCol", $account->id)
            ->selectRaw("DISTINCT EXTRACT(YEAR FROM ve.$dateCol)::int as y")
            ->orderBy('y', 'desc')
            ->pluck('y');

        // Default to latest (year, month) if not provided
        $latest = DB::table("$veTable as ve")
            ->where("ve.$fkCol", $account->id)
            ->selectRaw("
                EXTRACT(YEAR FROM MAX(ve.$dateCol))::int  as y,
                EXTRACT(MONTH FROM MAX(ve.$dateCol))::int as m
            ")
            ->first();

        $year  = $request->integer('year')  ?: ($latest->y ?? now()->year);
        $month = $request->integer('month') ?: ($latest->m ?? now()->month);

        // Month total (Debit/Credit) for selected year+month
        $totals = DB::table("$veTable as ve")
            ->where("ve.$fkCol", $account->id)
            ->whereRaw("EXTRACT(YEAR  FROM ve.$dateCol) = ?", [$year])
            ->whereRaw("EXTRACT(MONTH FROM ve.$dateCol) = ?", [$month])
            ->selectRaw("
                COALESCE(SUM(ve.$debitCol),0)  as debit_sum,
                COALESCE(SUM(ve.$creditCol),0) as credit_sum
            ")
            ->first();

        // Optional label for the UI
        $periodLabel = \Carbon\Carbon::createFromDate($year, $month, 1)->format('M Y');

        return Inertia::render('Accounts/Report', [
            'account' => [
                'id'     => $account->id,
                'code'   => $account->code,
                'name'   => $account->name,
                'type'   => $account->type,
                'active' => $account->active,
            ],
            'filters' => ['year' => $year, 'month' => $month, 'periodLabel' => $periodLabel],
            'years'   => $years,
            'totals'  => [
                'debit_sum'  => $totals->debit_sum ?? 0,
                'credit_sum' => $totals->credit_sum ?? 0,
                'net'        => ($totals->debit_sum ?? 0) - ($totals->credit_sum ?? 0),
            ],
        ]);
    }
}
