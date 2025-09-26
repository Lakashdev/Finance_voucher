<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('voucher_entry_allocations', function (Blueprint $table) {
            $table->id();

            // 🔗 Which voucher this allocation belongs to
            $table->foreignId('journal_voucher_id')
                  ->constrained('journal_vouchers')
                  ->cascadeOnDelete();

            // (optional) cached human label; keep nullable so it’s not “source of truth”
            $table->string('jv_number')->nullable()->index();

            // Debit & Credit entry links
            $table->foreignId('debit_entry_id')
                  ->constrained('voucher_entries')
                  ->cascadeOnDelete();

            $table->foreignId('credit_entry_id')
                  ->constrained('voucher_entries')
                  ->cascadeOnDelete();

            $table->decimal('amount', 14, 2);
            $table->timestamps();

            // Avoid duplicate pairs
            $table->unique(['debit_entry_id', 'credit_entry_id']);

            // Helpful indexes
            $table->index('debit_entry_id');
            $table->index('credit_entry_id');
            $table->index('journal_voucher_id');
        });

        // Postgres CHECK: keep amount positive
        DB::statement("
            ALTER TABLE voucher_entry_allocations
            ADD CONSTRAINT chk_allocation_amount_positive
            CHECK (amount > 0)
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('voucher_entry_allocations');
    }
};
