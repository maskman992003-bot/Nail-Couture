# One-time setup: create release keystore if missing (credentials match android/key.properties).
$ErrorActionPreference = "Stop"

$androidAppDir = Resolve-Path (Join-Path $PSScriptRoot "..\android\app")
$keystorePath = Join-Path $androidAppDir "nail_couture_key.jks"

if (Test-Path $keystorePath) {
    Write-Host "Keystore already exists: $keystorePath"
    exit 0
}

$keyPropsPath = Join-Path (Split-Path $androidAppDir -Parent) "key.properties"
if (-not (Test-Path $keyPropsPath)) {
    throw "Missing key.properties at $keyPropsPath"
}

$props = @{}
Get-Content $keyPropsPath | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
        $props[$matches[1].Trim()] = $matches[2].Trim()
    }
}

$storePass = $props["storePassword"]
$keyPass = $props["keyPassword"]
$alias = $props["keyAlias"]

Write-Host "Creating release keystore at $keystorePath"

& keytool -genkeypair -v `
    -storetype PKCS12 `
    -keystore $keystorePath `
    -alias $alias `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -storepass $storePass `
    -keypass $keyPass `
    -dname "CN=Nail Couture, O=Nail Couture, C=US"

Write-Host "Done. Back up nail_couture_key.jks and key.properties securely."
