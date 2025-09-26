<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('period_locks', function (Blueprint $table) {
            $table->id();
            $table->integer('year');
            $table->tinyInteger('month');
            $table->foreignId('locked_by')->constrained('users');
            $table->timestamp('locked_at')->useCurrent();
            $table->string('note')->nullable();
            $table->unique(['year', 'month']);
            $table->index(['year', 'month']);
        });
        DB::statement("
            ALTER TABLE period_locks
            ADD CONSTRAINT chk_period_month CHECK (month BETWEEN 1 AND 12)
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('period_locks');
    }
};
