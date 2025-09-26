<?php

namespace App\Http\Controllers;

use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AccountController extends Controller
{
    public function index(Request $request)
    {
        $q = trim((string) $request->get('q', ''));
        $type = $request->get('type'); // optional filter

        $accounts = Account::query()
            ->when($type, fn($w) => $w->type($type))
            ->search($q)                     // uses your scopeSearch (ILIKE)
            ->orderBy('name')
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('Accounts/Index', [
            'filters'  => ['q' => $q, 'type' => $type],
            'types'    => Account::TYPES, // ['asset','liability','equity','income','expense']
            'accounts' => $accounts->through(fn($a) => [
                'id'     => $a->id,
                'code'   => $a->code,
                'name'   => $a->name,
                'type'   => $a->type,
                'active' => (bool) $a->active,
            ]),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code'   => ['required','string','max:50','unique:accounts,code'],
            'name'   => ['required','string','max:255'],
            'type'   => ['required', Rule::in(Account::TYPES)],
            'active' => ['boolean'],
        ]);

        Account::create([
            'code'   => $data['code'],
            'name'   => $data['name'],
            'type'   => $data['type'],
            'active' => $data['active'] ?? true,
        ]);

        return back()->with('success', 'Account created.');
    }

    /* public function update(Request $request, Account $account)
    {
        $data = $request->validate([
            'code'   => ['required','string','max:50', Rule::unique('accounts','code')->ignore($account->id)],
            'name'   => ['required','string','max:255'],
            'type'   => ['required', Rule::in(Account::TYPES)],
            'active' => ['boolean'],
        ]);

        $account->update($data);

        return back()->with('success', 'Account updated.');
    }

    public function destroy(Account $account)
    {
        // prevent delete if referenced by entries
        if ($account->entries()->exists()) {
            return back()->with('error', 'Cannot delete: account is used in voucher entries.');
        }

        $account->delete();
        return back()->with('success', 'Account deleted.');
    } */
   
}
