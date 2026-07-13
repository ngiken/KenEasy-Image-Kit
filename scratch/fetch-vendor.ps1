# Optional: re-fetch vendored JS into web/vendor (run from project root)

$ErrorActionPreference = 'Stop'
$vendor = Join-Path $PSScriptRoot '..\web\vendor'
New-Item -ItemType Directory -Force -Path $vendor | Out-Null

$files = @{
  'Sortable.min.js' = 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.6/Sortable.min.js'
  'jszip.min.js'    = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'
}

foreach ($name in $files.Keys) {
  $out = Join-Path $vendor $name
  Write-Host "GET $name"
  Invoke-WebRequest -Uri $files[$name] -OutFile $out -UseBasicParsing
  Write-Host ('  {0} bytes' -f (Get-Item $out).Length)
}

Write-Host "Done -> $vendor"
