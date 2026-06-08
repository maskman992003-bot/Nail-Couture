# One-command Android dev: start emulator + Metro (dev client must already be installed)
$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "D:\Android\Sdk" }
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:ANDROID_AVD_HOME = if ($env:ANDROID_AVD_HOME) { $env:ANDROID_AVD_HOME } else { "D:\Android\avd" }
$env:Path = "$sdk\platform-tools;$sdk\emulator;" + $env:Path

$devices = & "$sdk\platform-tools\adb.exe" devices 2>&1 | Out-String
if ($devices -notmatch "emulator-\d+\s+device") {
  Write-Host "Starting emulator NailCouture..."
  Start-Process -FilePath "$sdk\emulator\emulator.exe" -ArgumentList "-avd","NailCouture","-gpu","swiftshader_indirect","-memory","2048","-no-boot-anim" -WindowStyle Normal
}

Set-Location (Split-Path $PSScriptRoot -Parent)
npm run start
