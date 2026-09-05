<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class EmployeeSearch
{
    public static function term(Request $request): string
    {
        return trim($request->validate(['search' => ['nullable', 'string', 'max:150']])['search'] ?? '');
    }

    public static function apply(Builder $query, string $search, array $columns = ['first_name', 'middle_name', 'last_name', 'employee_number', 'work_email']): Builder
    {
        // AND between words, OR between fields: full names work without SQL-specific concatenation.
        foreach (preg_split('/\s+/u', trim($search), -1, PREG_SPLIT_NO_EMPTY) as $word) {
            $query->where(function (Builder $query) use ($columns, $word): void {
                foreach ($columns as $column) {
                    $query->orWhere($column, 'like', "%{$word}%");
                }
            });
        }

        return $query;
    }
}
