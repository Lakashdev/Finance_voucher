<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('journal_vouchers', function (Blueprint $t) {
            if (!Schema::hasColumn('journal_vouchers', 'prepared_by')) {
                $t->foreignId('prepared_by')->nullable()->constrained('users');
            }
            if (!Schema::hasColumn('journal_vouchers', 'checked_by')) {
                $t->foreignId('checked_by')->nullable()->constrained('users');
            }
            if (!Schema::hasColumn('journal_vouchers', 'reject_reason')) {
                $t->string('reject_reason')->nullable();
            }
        });
    }

    public function down(): void {
        Schema::table('journal_vouchers', function (Blueprint $t) {
            if (Schema::hasColumn('journal_vouchers', 'prepared_by')) {
                $t->dropConstrainedForeignId('prepared_by');
            }
            if (Schema::hasColumn('journal_vouchers', 'checked_by')) {
                $t->dropConstrainedForeignId('checked_by');
            }
            if (Schema::hasColumn('journal_vouchers', 'reject_reason')) {
                $t->dropColumn('reject_reason');
            }
        });
    }
};
