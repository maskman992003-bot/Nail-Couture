# Build release APK + AAB using D: drive caches only.
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "env-d-drive.ps1")

$flutterDir = Resolve-Path (Join-Path $PSScriptRoot "..")

Set-Location $flutterDir

Write-Host "`n==> flutter pub get"
flutter pub get

Write-Host "`n==> flutter build apk --release"
flutter build apk --release

Write-Host "`n==> flutter build appbundle --release"
flutter build appbundle --release

Write-Host "`nDone."
Write-Host "APK: $flutterDir\build\app\outputs\flutter-apk\app-release.apk"
Write-Host "AAB: $flutterDir\build\app\outputs\bundle\release\app-release.aab"
