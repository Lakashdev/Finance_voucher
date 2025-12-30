<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Account;
use App\Models\JournalVoucher;
use App\Models\VoucherEntry;   // <-- singular model
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Models\VoucherEntryAllocation;


use Carbon\Carbon;

class JournalVoucherController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $r)
    {
        $q = JournalVoucher::query()
            ->with(['preparedBy:id,name', 'checkedBy:id,name'])
            ->withSum('lines as total_debit','debit')
            ->withSum('lines as total_credit','credit');

        if ($s = $r->input('search')) $q->where('jv_number','ilike',"%{$s}%");
        if ($st = $r->input('status')) $q->where('status',$st);
        if ($from = $r->input('from')) $q->whereDate('transaction_date','>=',$from);
        if ($to = $r->input('to'))     $q->whereDate('transaction_date','<=',$to);

        $vouchers = $q->orderByDesc('transaction_date')->orderByDesc('id')
                    ->paginate(15)->withQueryString();

        return Inertia::render('Vouchers/Index', [
            'filters'  => $r->only('search','status','from','to'),
            'vouchers' => $vouchers,
        ]);
    }

    public function create()
    {
        return Inertia::render('Vouchers/Create', [
            'accounts'  => Account::where('active', true)->orderBy('code')->get(['id','code','name']),
            'today'     => now()->toDateString(),
            'enteredBy' => auth()->user()->name,
        ]);
    }

    public function store(Request $r){
        $rules = [
            'transaction_date'   => ['required','date','before_or_equal:' . now()->toDateString()],
            'narration'          => ['nullable','string','max:2000'],

            // Lines
            'lines'              => ['required','array','min:2'],
            'lines.*.account_id' => ['required','integer','exists:accounts,id'], // credits may repeat
            'lines.*.side'       => ['required', Rule::in(['dr','cr'])],
            'lines.*.amount'     => ['required','numeric','min:0.01'],
            'lines.*.lf'         => ['nullable','string','max:50'],

            // Allocations (explicit, required)
        /*             'allocations' => ['nullable','array'],
            'allocations.*.debit_index'  => ['required_with:allocations.*','integer','min:0'],
            'allocations.*.credit_index' => ['required_with:allocations.*','integer','min:0'],
            'allocations.*.amount'       => ['required_with:allocations.*','numeric','min:0.01'], */
                    ];

        $messages = [
            'lines.min'                   => 'Add at least two lines.',
            'lines.*.account_id.required' => 'Please select an account header.',
            'lines.*.account_id.exists'   => 'The selected account header does not exist.',
            'lines.*.side.in'             => 'Side must be Debit or Credit.',
            'lines.*.amount.min'          => 'Amount must be greater than zero.',
            'lines.*.amount.numeric'      => 'Amount must be a number.',
            /* 'allocations.required'        => 'Please allocate each debit against one or more credit lines.', */
        ];

        $data = $r->validate($rules, $messages);

        // 1) Period lock
        $this->ensureNotLocked($data['transaction_date']);

        // 2) Normalize lines (compute debit/credit per row)
        $lines = collect($data['lines'])->map(function ($l) {
            $amt         = (float) $l['amount'];
            $l['debit']  = $l['side'] === 'dr' ? $amt : 0.00;
            $l['credit'] = $l['side'] === 'cr' ? $amt : 0.00;
            return $l;
        });

        // 3) Totals must balance
        $totalDr = round($lines->sum('debit'), 2);
        $totalCr = round($lines->sum('credit'), 2);
        if ($totalDr !== $totalCr) {
            return back()->withErrors(['lines' => 'Debit total must equal Credit total.'])->withInput();
        }

        // 4) Business rule: debit account headers must be unique; credits may repeat
        $dupDebit = $lines->filter(fn($l) => $l['side']==='dr')
                        ->pluck('account_id')->filter()->duplicates();
        if ($dupDebit->isNotEmpty()) {
            return back()->withErrors([
                'lines' => 'You cannot select the same account header on the Debit side more than once.'
            ])->withInput();
        }

        // 5) Validate allocations against provided lines (no FIFO)
        $allocs = collect($data['allocations'] ?? [])
                    ->filter(fn ($a) => isset($a['amount']) && (float)$a['amount'] > 0)
                    ->values();

            $hasAllocs = $allocs->isNotEmpty();

            if ($hasAllocs) {
            $n = $lines->count();

            // a) index bounds, correct sides, no self, no duplicate pairs
            $pairSeen = [];
            foreach ($allocs as $i => $a) {
                $di = (int) $a['debit_index'];
                $ci = (int) $a['credit_index'];

                if ($di < 0 || $di >= $n || $ci < 0 || $ci >= $n) {
                    return back()->withErrors([
                        'allocations' => "Allocation row #".($i+1).": invalid line index."
                    ])->withInput();
                }

                if (($lines[$di]['side'] ?? null) !== 'dr') {
                    return back()->withErrors([
                        'allocations' => "Allocation row #".($i+1).": debit_index is not a Debit line."
                    ])->withInput();
                }

                if (($lines[$ci]['side'] ?? null) !== 'cr') {
                    return back()->withErrors([
                        'allocations' => "Allocation row #".($i+1).": credit_index is not a Credit line."
                    ])->withInput();
                }

                if ($di === $ci) {
                    return back()->withErrors([
                        'allocations' => "Allocation row #".($i+1).": cannot allocate a line to itself."
                    ])->withInput();
                }

                $key = $di.'|'.$ci;
                if (isset($pairSeen[$key])) {
                    return back()->withErrors([
                        'allocations' => "Allocation row #".($i+1).": duplicate pair of the same debit & credit lines."
                    ])->withInput();
                }
                $pairSeen[$key] = true;
            }

            // b) prevent OVER-allocation (under-allocation is allowed)
            $sumByDebitIdx  = [];
            $sumByCreditIdx = [];

            foreach ($allocs as $a) {
                $sumByDebitIdx[(int)$a['debit_index']]   = ($sumByDebitIdx[(int)$a['debit_index']]   ?? 0) + (float)$a['amount'];
                $sumByCreditIdx[(int)$a['credit_index']] = ($sumByCreditIdx[(int)$a['credit_index']] ?? 0) + (float)$a['amount'];
            }

            foreach ($lines as $idx => $l) {
                if ($l['side'] === 'dr') {
                    $want = round($l['debit'], 2);
                    $got  = round($sumByDebitIdx[$idx] ?? 0, 2);
                    if ($got > $want) {
                        return back()->withErrors([
                            'allocations' => "Debit line #".($idx+1)." is over-allocated (max {$want}, got {$got})."
                        ])->withInput();
                    }
                }

                if ($l['side'] === 'cr') {
                    $want = round($l['credit'], 2);
                    $got  = round($sumByCreditIdx[$idx] ?? 0, 2);
                    if ($got > $want) {
                        return back()->withErrors([
                            'allocations' => "Credit line #".($idx+1)." is over-allocated (max {$want}, got {$got})."
                        ])->withInput();
                    }
                }
            }
        }
        // 6) Create voucher + entries + allocations (atomically)
        $voucher = DB::transaction(function () use ($data, $lines, $allocs,$hasAllocs) {

            $jv = JournalVoucher::create([
                'jv_number'        => $this->nextJvNo(),
                'transaction_date' => $data['transaction_date'],
                'status'           => JournalVoucher::S_SUBMITTED,
                'narration'        => $data['narration'] ?? null,
                'prepared_by'      => auth()->id(),
                'created_by'       => auth()->id(),
            ]);

            // preload account map (optional optimization)
            $accounts = Account::whereIn('id', $lines->pluck('account_id')->all())->get()->keyBy('id');

            // create entries in given order & keep index => entry
            $created = []; // index => VoucherEntry
            foreach ($lines as $i => $l) {
                $acc = $accounts[$l['account_id']];
                $created[$i] = $jv->lines()->create([
                    'account_header_id' => $acc->id,
                    'debit'             => $l['debit'],
                    'credit'            => $l['credit'],
                    // snapshots if you want:
                    // 'account_code_snapshot' => $acc->code,
                    // 'account_name_snapshot' => $acc->name,
                ]);
            }

            // write explicit allocations (required)
            if ($hasAllocs) {
                foreach ($allocs as $a) {
                    $d = $created[(int)$a['debit_index']];
                    $c = $created[(int)$a['credit_index']];

                    VoucherEntryAllocation::create([
                        'journal_voucher_id' => $jv->id,
                        'jv_number'          => $jv->jv_number,   // keep if your column exists
                        'debit_entry_id'     => $d->id,
                        'credit_entry_id'    => $c->id,
                        'amount'             => (float)$a['amount'],
                    ]);
                }
            }

            return $jv;
        });

        return redirect()->route('dashboard')
            ->with('success', "Voucher {$voucher->jv_number} created.");
    }


    private function ensureNotLocked(string $txnDate): void
    {
        $d = Carbon::parse($txnDate);
        $locked = DB::table('period_locks')
            ->where('year', $d->year)
            ->where('month', $d->month)
            ->exists();

        abort_if($locked, 422, 'This accounting period is locked. Choose another date.');
    }

    private function nextJvNo(): string
    {
        $year = (int) now()->format('Y');

        // Lock the counter row for this year inside the current transaction
        $row = DB::table('jv_counters')->where('year', $year)->lockForUpdate()->first();

        if (!$row) {
            DB::table('jv_counters')->insert([
                'year' => $year,
                'last_number' => 0,
                'updated_at' => now(),
            ]);
            $row = (object) ['last_number' => 0];
        }

        $next = (int) $row->last_number + 1;

        DB::table('jv_counters')
            ->where('year', $year)
            ->update(['last_number' => $next, 'updated_at' => now()]);

        // If your column is named jv_no use JV-%d-..., if it's jv_number keep the same format string
        return sprintf('JV-%d-%06d', $year, $next);
    }


    public function show(JournalVoucher $voucher)
    {
        $voucher->load([
            'preparedBy:id,name',
            'checkedBy:id,name',
            'lines' => fn ($q) => $q->orderBy('id')->with('account:id,code,name'),
        ]);

        // REMOVE the dd() now or you won't reach the view:
        // dd($voucher->toArray());

        return Inertia::render('Vouchers/Show', [
            'voucher' => [
                'id'               => $voucher->id,
                'jv_number'        => $voucher->jv_number,
                'transaction_date' => $voucher->transaction_date->toDateString(),
                'status'           => $voucher->status,
                'narration'        => $voucher->narration,
                'prepared_by'      => $voucher->preparedBy?->name,
                'checked_by'       => $voucher->checkedBy?->name,
                'lines'            => $voucher->lines->map(fn ($l) => [
                    'id'           => $l->id,
                    'account_code' => $l->account->code ?? '-',  // singular + safe
                    'account_name' => $l->account->name ?? '-',  // singular + safe
                    'debit'        => (float) $l->debit,
                    'credit'       => (float) $l->credit,
                    'lf'           => $l->lf,
                ])->values(),
            ],
        ]);
    }


    public function approveIndex(Request $r)
    {
        $q = JournalVoucher::query()
            ->where('status', 'submitted')
            ->with(['preparedBy:id,name'])
            ->withSum('lines as total_debit', 'debit')
            ->withSum('lines as total_credit','credit');

        if ($from = $r->input('from')) $q->whereDate('transaction_date','>=',$from);
        if ($to   = $r->input('to'))   $q->whereDate('transaction_date','<=',$to);

        $vouchers = $q->orderByDesc('transaction_date')->orderByDesc('id')
                    ->paginate(15)->withQueryString();

        return Inertia::render('Vouchers/Approve', [
            'filters'  => $r->only('from','to'),
            'vouchers' => $vouchers,
        ]);
    }
    public function approve(JournalVoucher $voucher)
    {
        // Prevent double-processing
        if ($voucher->status !== 'submitted') {
            return back()->with('error', 'This voucher is already processed.');
        }

        DB::transaction(function () use ($voucher) {
            $voucher->forceFill([
                'status'        => 'approved',
                'approved_by'   => Auth::id(),
                'reject_reason' => null,
            ])->save();
        });

        return back()->with('success', "Voucher {$voucher->jv_number} approved.");
    }

    public function reject(Request $r, JournalVoucher $voucher)
    {
        $data = $r->validate([
            'reject_reason' => 'required|string|max:500',
        ]);

        if ($voucher->status !== 'submitted') {
            return back()->with('error', 'This voucher is already processed.');
        }

        DB::transaction(function () use ($voucher, $data) {
            $voucher->forceFill([
                'status'        => 'rejected',
                'approved_by'   => Auth::id(),      // who performed the decision
                'reject_reason' => $data['reject_reason'],
            ])->save();
        });

        return back()->with('success', "Voucher {$voucher->jv_number} rejected.");
    }

    public function showApproval(JournalVoucher $voucher)
    {
            $voucher->load([
                'preparedBy:id,name',
                'checkedBy:id,name',
                'lines' => fn($q) => $q->orderBy('id')->with('account:id,code,name'),
            ]);

            return Inertia::render('Vouchers/ShowApproval', [
                'voucher' => [
                    'id'               => $voucher->id,
                    'jv_number'        => $voucher->jv_number,
                    'transaction_date' => $voucher->transaction_date->toDateString(),
                    'status'           => $voucher->status,
                    'narration'        => $voucher->narration,
                    'prepared_by'      => $voucher->preparedBy?->name,
                    'checked_by'       => $voucher->checkedBy?->name,
                    'lines'            => $voucher->lines->map(fn ($l) => [
                        'id'           => $l->id,
                        'account_code' => data_get($l, 'account.code', '-'),
                        'account_name' => data_get($l, 'account.name', '-'),
                        'lf'           => $l->lf,
                        'debit'        => (float) $l->debit,
                        'credit'       => (float) $l->credit,
                    ])->values(),
                ],
                'canApprove' => auth()->user()?->role === 'supervisor' && $voucher->status === 'submitted',
            ]);
    }


    public function rejectedIndex(Request $request)
    {
        $q = (string) $request->query('q', '');

        $vouchers = JournalVoucher::query()
            /* ->where('created_by', $request->user()->id)   */             // only mine
            ->where('status', JournalVoucher::S_REJECTED)              // only rejected
            ->when($q, function ($query) use ($q) {
                $like = "%{$q}%";
                $query->where(function ($w) use ($like) {
                    $w->where('jv_number', 'like', $like)
                    ->orWhere('reject_reason', 'like', $like);
                });
            })
            ->orderByDesc('updated_at')
            ->paginate(10)
            ->withQueryString()
            ->through(function (JournalVoucher $v) use ($request) {
                return [
                    'id'            => $v->id,
                    'jv_number'     => $v->jv_number,
                    'reject_reason' => $v->reject_reason,
                    'updated_at'    => $v->updated_at?->toDateTimeString(),
                    'can' => [
                        'view'   => $request->user()->can('view', $v),
                        'update' => $request->user()->can('update', $v), // accountant can edit rejected (per policy)
                    ],
                ];
            });

        return Inertia::render('Vouchers/RejectedIndex', [
            'filters'  => ['q' => $q],
            'vouchers' => $vouchers,
        ]);
    }

    public function edit(Request $request, JournalVoucher $voucher){
        $this->authorize('update', $voucher);

        // Load lines (ordered) + account
        $linesE = $voucher->lines()
            ->with('account:id,code,name')
            ->orderBy('id')
            ->get();

        // Build a quick lookup: entry_id -> global line index
        $globalIndexByEntryId = $linesE->pluck('id')->flip(); // e.g. [42 => 0, 43 => 1, ...]

        // Build "debits array positions": entry_id -> debitIndex (0..N-1 among debits)
        $debitEntryIdToPos = [];
        $debitsGlobalIdx   = [];
        foreach ($linesE as $idx => $le) {
            if ((float)$le->debit > 0) {
                $debitsGlobalIdx[] = $idx;                    // global index for this debit line
                $debitEntryIdToPos[$le->id] = count($debitsGlobalIdx) - 1; // position in debits array
            }
        }

        // Load existing allocations for this voucher
        $allocs = \App\Models\VoucherEntryAllocation::query()
            ->where('journal_voucher_id', $voucher->id)
            ->get(['debit_entry_id','credit_entry_id','amount']);

        // Map: credit global index -> debit position (alloc_to used by the UI)
        $allocToByCreditGlobalIdx = [];
        foreach ($allocs as $a) {
            if (!isset($globalIndexByEntryId[$a->credit_entry_id])) continue;
            if (!isset($debitEntryIdToPos[$a->debit_entry_id]))     continue;

            $ciGlobal = $globalIndexByEntryId[$a->credit_entry_id]; // which credit line (global)
            $diPos    = $debitEntryIdToPos[$a->debit_entry_id];     // which debit (index in debits array)
            // NOTE: if you ever allow splitting a single credit across multiple debits,
            // you'll need a different UI. Current UI supports one target per credit.
            $allocToByCreditGlobalIdx[$ciGlobal] = $diPos;
        }

        // Map DB shape to UI shape (include alloc_to for credits)
        $lines = $linesE->map(function ($l, $idx) use ($allocToByCreditGlobalIdx) {
            $isDebit   = (float) $l->debit > 0;
            $amount    = $isDebit ? (float) $l->debit : (float) $l->credit;
            $accountId = $l->account_header_id ?: optional($l->account)->id;

            return [
                'account_id' => $accountId ? (string) $accountId : '',
                'side'       => $isDebit ? 'dr' : 'cr',
                'amount'     => number_format($amount, 2, '.', ''),
                // only for credit rows: which debit (by debit-list index) this credit is allocated to
                'alloc_to'   => $isDebit ? '' : (isset($allocToByCreditGlobalIdx[$idx])
                                    ? (string) $allocToByCreditGlobalIdx[$idx]
                                    : ''), // empty if no allocation found
                // 'lf'      => $l->lf, // add if you’re using LF
            ];
        })->values();

        // Accounts for the dropdown
        $accounts = \App\Models\Account::orderBy('name')->get(['id','name','code']);

        // Include creator if you use it
        $voucher->loadMissing('creator:id,name');

        return Inertia::render('Vouchers/Edit', [
            'voucher' => [
                'id'               => $voucher->id,
                'jv_number'        => $voucher->jv_number,
                'transaction_date' => optional($voucher->transaction_date)->toDateString(),
                'entered_by'       => $voucher->creator?->name ?? $request->user()->name,
                'date_entered'     => optional($voucher->created_at)->toDateString(),
                'status'           => $voucher->status,
                'reject_reason'    => $voucher->reject_reason,
                'narration'        => $voucher->narration,
                'lines'            => $lines,  // ← now includes alloc_to for credits
            ],
            'accounts' => $accounts,
            'can' => [
                'update' => $request->user()->can('update', $voucher),
                'submit' => $request->user()->can('submit', $voucher),
            ],
        ]);
    }

    public function update(Request $request, JournalVoucher $voucher)
    {
    $this->authorize('update', $voucher);

    // 1) Validate lines + EXPLICIT allocations (same rules as store)
    $rules = [
        'narration'          => ['nullable','string','max:1000'],

        'lines'              => ['required','array','min:2'],
        // No global distinct: credits can repeat. We'll enforce "debit unique" below.
        'lines.*.account_id' => ['required','integer','exists:accounts,id'],
        'lines.*.side'       => ['required', Rule::in(['dr','cr'])],
        'lines.*.amount'     => ['required','numeric','min:0.01'],

        // Explicit allocations are REQUIRED on edit as well
        'allocations'                    => ['required','array','min:1'],
        'allocations.*.debit_index'      => ['required','integer','min:0'],
        'allocations.*.credit_index'     => ['required','integer','min:0'],
        'allocations.*.amount'           => ['required','numeric','min:0.01'],
    ];
    $messages = [
        'lines.min'                   => 'Add at least two lines.',
        'lines.*.account_id.required' => 'Please select an account header.',
        'lines.*.account_id.exists'   => 'The selected account header does not exist.',
        'lines.*.side.in'             => 'Side must be Debit or Credit.',
        'lines.*.amount.min'          => 'Amount must be greater than zero.',
        'lines.*.amount.numeric'      => 'Amount must be a number.',

        'allocations.required'        => 'Please allocate each debit against one or more credit lines.',
    ];
    $data = $request->validate($rules, $messages);

    // 2) Map Dr/Cr & balance check
    $lines = collect($data['lines'])->map(function ($l) {
        $l['debit']  = $l['side'] === 'dr' ? (float)$l['amount'] : 0.0;
        $l['credit'] = $l['side'] === 'cr' ? (float)$l['amount'] : 0.0;
        return $l;
    });

    $totalDr = round($lines->sum('debit'), 2);
    $totalCr = round($lines->sum('credit'), 2);
    if ($totalDr !== $totalCr) {
        return back()->withErrors(['lines' => 'Debit total must equal Credit total.'])->withInput();
    }

    // 3) Business rule: **Debit account headers must be unique**; credits may repeat
    $dupDebits = $lines->filter(fn($l) => $l['side'] === 'dr')
                       ->pluck('account_id')->filter()->duplicates();
    if ($dupDebits->isNotEmpty()) {
        return back()->withErrors([
            'lines' => 'You cannot select the same account header on the Debit side more than once.',
        ])->withInput();
    }

    // 4) Validate allocations vs the lines
    $allocs = collect($data['allocations'] ?? []);
    $n = $lines->count();

    // a) index bounds, correct sides, no self-pair, no duplicate pairs
    $pairSeen = [];
    foreach ($allocs as $i => $a) {
        $di = (int)$a['debit_index'];
        $ci = (int)$a['credit_index'];

        if ($di < 0 || $di >= $n || $ci < 0 || $ci >= $n) {
            return back()->withErrors(['allocations' => "Allocation row #".($i+1).": invalid line index."])->withInput();
        }
        if (($lines[$di]['side'] ?? null) !== 'dr') {
            return back()->withErrors(['allocations' => "Allocation row #".($i+1).": debit_index is not a Debit line."])->withInput();
        }
        if (($lines[$ci]['side'] ?? null) !== 'cr') {
            return back()->withErrors(['allocations' => "Allocation row #".($i+1).": credit_index is not a Credit line."])->withInput();
        }
        if ($di === $ci) {
            return back()->withErrors(['allocations' => "Allocation row #".($i+1).": cannot allocate a line to itself."])->withInput();
        }

        $key = $di.'|'.$ci;
        if (isset($pairSeen[$key])) {
            return back()->withErrors(['allocations' => "Allocation row #".($i+1).": duplicate pair of the same debit & credit lines."])->withInput();
        }
        $pairSeen[$key] = true;
    }

    // b) Every debit & credit must be fully allocated (no leftovers, no over-alloc)
    $sumByDebitIdx  = [];
    $sumByCreditIdx = [];
    foreach ($allocs as $a) {
        $sumByDebitIdx[(int)$a['debit_index']]   = ($sumByDebitIdx[(int)$a['debit_index']]   ?? 0) + (float)$a['amount'];
        $sumByCreditIdx[(int)$a['credit_index']] = ($sumByCreditIdx[(int)$a['credit_index']] ?? 0) + (float)$a['amount'];
    }
    foreach ($lines as $idx => $l) {
        if ($l['side'] === 'dr') {
            $want = round($l['debit'], 2);
            $got  = round($sumByDebitIdx[$idx] ?? 0, 2);
            if ($want !== $got) {
                return back()->withErrors([
                    'allocations' => "Debit line #".($idx+1)." must be fully allocated (expected {$want}, got {$got})."
                ])->withInput();
            }
        }
        if ($l['side'] === 'cr') {
            $want = round($l['credit'], 2);
            $got  = round($sumByCreditIdx[$idx] ?? 0, 2);
            if ($want !== $got) {
                return back()->withErrors([
                    'allocations' => "Credit line #".($idx+1)." must be fully allocated (expected {$want}, got {$got})."
                ])->withInput();
            }
        }
    }

    // 5) Update voucher + lines + allocations atomically
    DB::transaction(function () use ($voucher, $data, $lines, $allocs) {
        // a) header
        $voucher->update([
            'narration'      => $data['narration'] ?? null,
            'status'         => JournalVoucher::S_SUBMITTED, // resubmitted
            'reject_reason'  => null,
            'approved_by'    => null,
        ]);

        // b) remove old lines → cascades delete old allocations (FKs)
        $voucher->lines()->delete();

        // c) recreate lines in provided order; keep index → model map
        $created = []; // [index => VoucherEntry]
        foreach ($lines as $i => $l) {
            $created[$i] = VoucherEntry::create([
                'journal_voucher_id' => $voucher->id,
                'account_header_id'  => (int) $l['account_id'],
                'debit'              => $l['debit'],
                'credit'             => $l['credit'],
            ]);
        }

        // d) recreate allocations
        foreach ($allocs as $a) {
            $d = $created[(int)$a['debit_index']];
            $c = $created[(int)$a['credit_index']];

            VoucherEntryAllocation::create([
                'journal_voucher_id' => $voucher->id,       // ← IMPORTANT: avoids NOT NULL error
                // include this if you added the column and want it filled too:
                'jv_number'          => $voucher->jv_number,
                'debit_entry_id'     => $d->id,
                'credit_entry_id'    => $c->id,
                'amount'             => (float)$a['amount'],
            ]);
        }
    });

    return redirect()
        ->route('vouchers.index')
        ->with('success', "Voucher {$voucher->jv_number} updated and submitted for approval.");
}
}
