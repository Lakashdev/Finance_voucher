<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('jv_counters', function (Blueprint $t) {
            $t->integer('year')->primary();        // e.g. 2025
            $t->bigInteger('last_number')->default(0);
            $t->timestamp('updated_at')->nullable();
        });
    }
    public function down(): void {
        Schema::dropIfExists('jv_counters');
    }
};
