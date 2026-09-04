<?php

use Inertia\Inertia;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'stack' => [
            'Laravel 13',
            'React 19',
            'Inertia.js',
            'Tailwind CSS 4',
            'SQLite for local development',
            'Pest',
        ],
    ]);
});
