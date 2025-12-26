<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\JournalVoucherController;
use App\Http\Controllers\UserController;
use App\Models\JournalVoucher;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\VoucherEntryController;
use App\Http\Controllers\Reports\AccountReportController;
Route::get('/', function () {
    return auth()->check() ? redirect()->route('dashboard') : redirect()->route('login');
});

/**
 * USER MANAGEMENT (only Main user / supervisor per your gate)
 */
Route::middleware(['auth', 'can:manage-users'])->group(function () {
    Route::resource('users', UserController::class)->except(['show','create','edit']);
});

/**
 * AUTHENTICATED APP
 */
Route::middleware(['auth','verified'])->group(function () {

    Route::get('/dashboard', fn () => Inertia::render('Dashboard'))->name('dashboard');

    /** INDEX (any authenticated) */
    Route::get('/vouchers', [JournalVoucherController::class, 'index'])
        ->name('vouchers.index');

    /** CREATE + STORE (Accountant only) */
    Route::get('/vouchers/create', [JournalVoucherController::class, 'create'])
        ->name('vouchers.create')
        ->can('create', JournalVoucher::class);

    Route::post('/vouchers', [JournalVoucherController::class, 'store'])
        ->name('vouchers.store')
        ->can('create', JournalVoucher::class);

    /**
     * SUPERVISOR APPROVAL INBOX (list of submitted vouchers)
     * Use a simple Gate "review-vouchers" (see note below).
     */
    Route::get('/vouchers/approve', [JournalVoucherController::class,'approveIndex'])
        ->name('vouchers.approve')
        ->middleware('can:review-vouchers');

    /** SUBMIT (Accountant only; only draft/rejected) */
    Route::post('/vouchers/{voucher}/submit', [JournalVoucherController::class,'submit'])
        ->whereNumber('voucher')
        ->name('vouchers.submit')
        ->can('submit','voucher');

    /** APPROVAL ACTIONS (Supervisor only; only submitted) */
    Route::patch('/vouchers/{voucher}/approve', [JournalVoucherController::class,'approve'])
        ->whereNumber('voucher')
        ->name('vouchers.approve.one')
        ->can('approve','voucher');

    Route::patch('/vouchers/{voucher}/reject', [JournalVoucherController::class,'reject'])
        ->whereNumber('voucher')
        ->name('vouchers.reject')
        ->can('reject','voucher');

    /** VIEW + EDIT/UPDATE (policy-enforced) */
    Route::get('/vouchers/{voucher}', [JournalVoucherController::class, 'show'])
        ->whereNumber('voucher')
        ->name('vouchers.show')
        ->can('view','voucher');

    Route::get('/vouchers/{voucher}/edit', [JournalVoucherController::class, 'edit'])
        ->whereNumber('voucher')
        ->name('vouchers.edit')
        ->middleware('can:update,voucher');

    Route::put('/vouchers/{voucher}', [JournalVoucherController::class, 'update'])
        ->whereNumber('voucher')
        ->name('vouchers.update')
        ->middleware('can:update,voucher');

    /** (Optional) approval detail page for supervisors */
    Route::get('approval/vouchers/{voucher}', [JournalVoucherController::class,'showApproval'])
        ->whereNumber('voucher')
        ->name('approve.vouchers.show')
        ->can('approve','voucher');



    Route::get('/vouchers/rejected', [JournalVoucherController::class, 'rejectedIndex'])
    ->name('vouchers.rejected')
    ->middleware(['auth', 'role:accountant']);
        // EDIT + UPDATE (policy-enforced)
    Route::get('/vouchers/{voucher}/edit', [JournalVoucherController::class, 'edit'])
        ->whereNumber('voucher')->name('vouchers.edit')->can('update','voucher');

    Route::put('/vouchers/{voucher}', [JournalVoucherController::class, 'update'])
        ->whereNumber('voucher')->name('vouchers.update')->can('update','voucher');

    // SUBMIT (re-submit allowed on draft/rejected by policy)
    Route::post('/vouchers/{voucher}/submit', [JournalVoucherController::class,'submit'])
        ->whereNumber('voucher')->name('vouchers.submit')->can('submit','voucher');


    Route::middleware(['auth', 'can:manage-accounts'])->group(function () {
    Route::resource('accounts', AccountController::class)->except(['show','create','edit']);
    });
});

Route::middleware(['auth'])->group(function () {
    Route::get('/accounts/{account}/report', [AccountReportController::class, 'show'])
        ->name('accounts.report');
});

Route::get('/entries', [VoucherEntryController::class, 'index'])
    ->name('entries.index');

Route::get('/entries/export', [VoucherEntryController::class, 'export'])
    ->name('entries.export');

Route::get('/debug/manage-users', function () {
    return [
        'user_id' => auth()->id(),
        'role'    => auth()->user()?->role,
        'allows'  => Gate::allows('manage-users'),
    ];
})->middleware('auth');
require __DIR__.'/auth.php';
