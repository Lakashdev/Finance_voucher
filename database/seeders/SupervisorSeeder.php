<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SupervisorSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'supervisor@example.com'],
            [
                'name' => 'Main Supervisor',
                'password' => Hash::make('password123'),
                'role' => 'supervisor',
                'active' => true,
            ]
        );
    }
}
