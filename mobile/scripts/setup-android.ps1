param(
  [string]$SdkRoot = 'C:\AndroidSdk',
  [string]$NinjaVersion = '1.12.1'
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$cacheDir = Join-Path $projectRoot '.metro'
$androidRoot = Join-Path $projectRoot 'android'

function Write-Step($message) {
  Write-Host "[setup-android] $message"
}

function Write-Warn($message) {
  Write-Host "[setup-android] AVISO: $message" -ForegroundColor Yellow
}

New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null

# 1. Rutas largas de Windows.
# Las rutas de codegen nativo que genera React Native superan los 260 caracteres en esta
# carpeta del proyecto, y ninja solo las acepta si Windows tiene habilitadas las rutas largas.
$longPaths = (Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' -Name LongPathsEnabled -ErrorAction SilentlyContinue).LongPathsEnabled

if ($longPaths -eq 1) {
  Write-Step 'Rutas largas de Windows habilitadas'
}
else {
  Write-Warn 'Windows no tiene habilitadas las rutas largas y el build nativo va a fallar.'
  Write-Warn 'Ejecutá esto en una consola de administrador y volvé a correr el script:'
  Write-Warn '  reg add HKLM\SYSTEM\CurrentControlSet\Control\FileSystem /v LongPathsEnabled /t REG_DWORD /d 1 /f'
}

# 2. CMake con ninja compatible con rutas largas.
$cmakeRoot = Join-Path $SdkRoot 'cmake'
$sourceCmake = Get-ChildItem $cmakeRoot -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match '^\d' -and $_.Name -notlike '*-lgpaths' } |
  Sort-Object Name -Descending |
  Select-Object -First 1

if (-not $sourceCmake) {
  throw "No se encontro CMake en $cmakeRoot"
}

$targetCmake = Join-Path $cmakeRoot "$($sourceCmake.Name)-lgpaths"
$targetNinja = Join-Path $targetCmake 'bin\ninja.exe'

if (-not (Test-Path $targetCmake)) {
  Write-Step "Preparando CMake con rutas largas en $($targetCmake.Name)"
  Copy-Item -Recurse -Path $sourceCmake.FullName -Destination $targetCmake
}

$ninjaVersion = (& $targetNinja --version) 2>$null

if (-not $ninjaVersion -or [version]($ninjaVersion -replace '[^0-9.].*$', '') -lt [version]'1.11.0') {
  Write-Step "Descargando ninja $NinjaVersion"

  $zipPath = Join-Path $cacheDir 'ninja-win.zip'
  $extractDir = Join-Path $cacheDir 'ninja'

  Invoke-WebRequest -Uri "https://github.com/ninja-build/ninja/releases/download/v$NinjaVersion/ninja-win.zip" -UseBasicParsing -OutFile $zipPath
  Remove-Item -Recurse -Force $extractDir -ErrorAction SilentlyContinue
  Expand-Archive -LiteralPath $zipPath -DestinationPath $extractDir -Force
  Copy-Item -LiteralPath (Join-Path $extractDir 'ninja.exe') -Destination $targetNinja -Force
}

$ninjaVersion = (& $targetNinja --version) 2>$null
Write-Step "CMake $($sourceCmake.Name) con ninja $ninjaVersion en $(Split-Path -Leaf $targetCmake)"

# 3. local.properties con el SDK y el CMake elegido.
if (-not (Test-Path $androidRoot)) {
  Write-Step 'La carpeta android todavía no existe: corré expo prebuild primero'
  return
}

$sdkDir = $SdkRoot.Replace('\', '\\').Replace(':', '\:')
$cmakeDir = $targetCmake.Replace('\', '\\').Replace(':', '\:')

$localProperties = Join-Path $androidRoot 'local.properties'
Set-Content -LiteralPath $localProperties -Value "sdk.dir=$sdkDir`r`ncmake.dir=$cmakeDir" -Encoding ASCII
Write-Step "local.properties actualizado con sdk.dir y cmake.dir"
