param(
    [string]$Php,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ArtisanArguments = @('test')
)

$ErrorActionPreference = 'Stop'
$candidates = @($Php, (Join-Path $env:USERPROFILE '.codex/runtimes/php83/php.exe'))
$pathPhp = Get-Command php -ErrorAction SilentlyContinue
if ($pathPhp) { $candidates += $pathPhp.Source }
$runtime = $null
foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) {
        $version = & $candidate -r 'echo PHP_VERSION_ID;'
        if ($LASTEXITCODE -eq 0 -and [int]$version -ge 80300) {
            $runtime = $candidate
            break
        }
    }
}
if (-not $runtime) { throw 'PHP 8.3+ is required. Supply -Php with the path to a compatible php.exe.' }
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    & $runtime artisan @ArtisanArguments
    $result = $LASTEXITCODE
} finally {
    Pop-Location
}
exit $result
