<?php

namespace App\Support;

use Closure;
use Illuminate\Database\Eloquent\Builder;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CsvExporter
{
    public static function streamCsv(string $filename, array $headers, Builder $query, Closure $mapRow, int $chunkSize = 200): StreamedResponse
    {
        return response()->streamDownload(function () use ($headers, $query, $mapRow, $chunkSize): void {
            $output = fopen('php://output', 'w');

            fputcsv($output, $headers, ',', '"', '');

            $query->chunk($chunkSize, function ($rows) use ($output, $mapRow): void {
                foreach ($rows as $row) {
                    fputcsv($output, $mapRow($row), ',', '"', '');
                }

                fflush($output);
            });

            fclose($output);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}
