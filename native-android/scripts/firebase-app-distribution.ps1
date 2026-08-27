param(
    [Parameter(Mandatory = $true)][string]$Groups,
    [ValidateSet('Debug', 'Release')][string]$Variant = 'Release',
    [string]$ReleaseNotes = 'paymatrix native Android 2.0.2 - web theme parity, friend photos, and improved logs; may contain bugs'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$variantFolder = $Variant.ToLowerInvariant()
$apk = Join-Path $projectRoot "app\build\outputs\apk\$variantFolder\app-$variantFolder.apk"
if (-not (Test-Path -LiteralPath $apk)) { throw "Build the $Variant APK first: $apk" }
firebase appdistribution:distribute $apk `
    --app '1:344969363066:android:f200bee5cbcf086a3305c3' `
    --groups $Groups `
    --release-notes $ReleaseNotes `
    --project paymatrix-174b5
if ($LASTEXITCODE -ne 0) { throw "Firebase App Distribution upload failed" }
