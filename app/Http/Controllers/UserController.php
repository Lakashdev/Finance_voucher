<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class UserController extends Controller
{
    /* public function __construct()
    {
        // Extra safety in addition to route middleware
        $this->middleware(['auth', 'can:manage-users']);
    } */

    public function index(Request $request)
    {
        $q = $request->string('q')->toString();

        $users = User::query()
            ->when($q, function ($query) use ($q) {
                $like = '%'.$q.'%';
                $query->where(function ($w) use ($like) {
                    $w->where('name', 'like', $like)
                      ->orWhere('email', 'like', $like)
                      ->orWhere('role', 'like', $like);
                });
            })
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Users/Index', [
            'filters' => ['q' => $q],
            'users'   => $users,
            'roles'   => ['supervisor','accountant'], // adjust to your roles
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'                  => ['required','string','max:150'],
            'email'                 => ['required','email','max:190','unique:users,email'],
            'role'                  => ['required','in:supervisor,accountant'],
            /* 'is_active'             => ['nullable','boolean'], */
            'password'              => ['required','string','min:8','confirmed'],
        ]);

        $user = new User();
        $user->name      = $data['name'];
        $user->email     = $data['email'];
        $user->role      = $data['role'];
       /*  $user->is_active = $data['is_active'] ?? true; */
        $user->password  = Hash::make($data['password']);
        $user->save();

        return back()->with('success', 'User created.');
    }

    public function update(Request $request, User $user)
    {
        // Optional: prevent changing your own role
        if ($request->user()->id === $user->id && $request->input('role') !== $user->role) {
            return back()->with('error', "You can't change your own role.");
        }

        $data = $request->validate([
            'name'                  => ['required','string','max:150'],
            'email'                 => ['required','email','max:190', Rule::unique('users','email')->ignore($user->id)],
            'role'                  => ['required','in:supeprrvisor,accountant'],
            /* 'is_active'             => ['nullable','boolean'], */
            'password'              => ['nullable','string','min:8','confirmed'],
        ]);

        $user->name      = $data['name'];
        $user->email     = $data['email'];
        $user->role      = $data['role'];
        /* $user->is_active = array_key_exists('is_active', $data) ? (bool)$data['is_active'] : $user->is_active; */

        if (!empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }

        $user->save();

        return back()->with('success', 'User updated.');
    }

    public function destroy(Request $request, User $user)
    {
        if ($request->user()->id === $user->id) {
            return back()->with('error', "You can't delete yourself.");
        }

        $user->delete();
        return back()->with('success', 'User deleted.');
    }
}
