param(
    [ValidateSet('Debug', 'Release')]
    [string]$Variant = 'Debug'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$jdkPath = 'C:\Program Files\Android\Android Studio\jbr'
if (-not (Test-Path -LiteralPath $jdkPath)) { throw "Android Studio JDK 21 not found at $jdkPath" }
$env:JAVA_HOME = $jdkPath
$sdkPath = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if (-not (Test-Path -LiteralPath $sdkPath)) { throw "Android SDK not found at $sdkPath" }
$env:ANDROID_HOME = $sdkPath
$env:ANDROID_SDK_ROOT = $sdkPath
$task = if ($Variant -eq 'Release') { 'assembleRelease' } else { 'assembleDebug' }
Push-Location $projectRoot
try {
    & .\gradlew.bat testDebugUnitTest lintDebug $task
    if ($LASTEXITCODE -ne 0) { throw "Gradle failed with exit code $LASTEXITCODE" }
} finally {
    Pop-Location
}
