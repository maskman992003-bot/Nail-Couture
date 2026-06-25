# Force Flutter/Android tooling caches onto D: (avoids filling C:).
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$cacheRoot = Join-Path $repoRoot ".toolcache"

$dirs = @(
    $cacheRoot,
    (Join-Path $cacheRoot "gradle"),
    (Join-Path $cacheRoot "pub-cache"),
    (Join-Path $cacheRoot "tmp"),
    (Join-Path $cacheRoot "dart-tool")
)

foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

$env:GRADLE_USER_HOME = Join-Path $cacheRoot "gradle"
$env:PUB_CACHE = Join-Path $cacheRoot "pub-cache"
$env:TEMP = Join-Path $cacheRoot "tmp"
$env:TMP = Join-Path $cacheRoot "tmp"

# Keep Android/Flutter SDK paths on D: when local.properties is configured.
$localProps = Join-Path $repoRoot "apps\New_Flutter\android\local.properties"
if (Test-Path $localProps) {
    Get-Content $localProps | ForEach-Object {
        if ($_ -match '^sdk\.dir=(.+)$') {
            $env:ANDROID_HOME = $matches[1].Replace('\\', '\')
            $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
        }
        if ($_ -match '^flutter\.sdk=(.+)$') {
            $env:FLUTTER_ROOT = $matches[1].Replace('\\', '\')
        }
    }
}

Write-Host "Build caches on D:"
Write-Host "  GRADLE_USER_HOME = $env:GRADLE_USER_HOME"
Write-Host "  PUB_CACHE        = $env:PUB_CACHE"
Write-Host "  TEMP/TMP         = $env:TEMP"
