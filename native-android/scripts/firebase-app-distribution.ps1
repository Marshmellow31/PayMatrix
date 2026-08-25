param(
    [Parameter(Mandatory = $true)][string]$Groups,
    [string]$ReleaseNotes = 'paymatrix native Android preview'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$apk = Join-Path $projectRoot 'app\build\outputs\apk\debug\app-debug.apk'
if (-not (Test-Path -LiteralPath $apk)) { throw "Build the debug APK first: $apk" }
firebase appdistribution:distribute $apk `
    --app '1:344969363066:android:3709eb27bcfa07fb3305c3' `
    --groups $Groups `
    --release-notes $ReleaseNotes `
    --project paymatrix-174b5
if ($LASTEXITCODE -ne 0) { throw "Firebase App Distribution upload failed" }
