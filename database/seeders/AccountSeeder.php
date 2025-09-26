<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Account;

class AccountSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            // Existing ones (keep as-is)
            ['code' => '4',   'name' => 'Cash',                         'type' => 'asset',    'active' => true],
            ['code' => '25',  'name' => 'Refreshments',                 'type' => 'expense',  'active' => true],

            // ➕ New ones you asked for
            ['code' => '5',   'name' => 'Citizen Bank Ltd. (Current)',  'type' => 'asset',    'active' => true],   // “To Citizen Bank”
            ['code' => '210', 'name' => 'Provident Fund (PF) Payable',  'type' => 'liability','active' => true],   // PF
            ['code' => '211', 'name' => 'CIT Payable',                  'type' => 'liability','active' => true],   // CIT
            ['code' => '26',  'name' => 'Stationery',                   'type' => 'expense',  'active' => true],   // (note: Stationery)

            // (Optional) a couple of common expenses to make testing easier
            ['code' => '27',  'name' => 'Printing & Photocopy',         'type' => 'expense',  'active' => true],
            ['code' => '28',  'name' => 'Internet & Communication',     'type' => 'expense',  'active' => true],
        ];

        foreach ($rows as $r) {
            Account::updateOrCreate(
                ['code' => $r['code']],                      // unique key
                ['name' => $r['name'], 'type' => $r['type'], 'active' => $r['active']]
            );
        }
    }
}
