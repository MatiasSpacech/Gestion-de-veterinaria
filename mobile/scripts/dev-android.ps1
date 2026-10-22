param(
  [string]$Avd = 'Medium_Phone_API_37.0',
  [string]$Package = 'com.vetgestion.mobile',
  [string]$SdkRoot = 'C:\AndroidSdk',
  [string]$JavaHome = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.3.9-hotspot',
  [int]$MetroPort = 8081,
  [string]$Architectures = 'x86_64',
  [switch]$SkipMetro,
  [switch]$SkipBuild,
  [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $projectRoot 'android'
$logDir = Join-Path $projectRoot '.metro'
$apkPath = Join-Path $androidRoot 'app\build\outputs\apk\debug\app-debug.apk'
$metroLog = Join-Path $logDir 'metro.log'
$metroErrorLog = Join-Path $logDir 'metro.error.log'
$emulatorLog = Join-Path $logDir 'emulator.log'

$adb = Join-Path $SdkRoot 'platform-tools\adb.exe'
$emulator = Join-Path $SdkRoot 'emulator\emulator.exe'
$gradlew = Join-Path $androidRoot 'gradlew.bat'
$npx = 'C:\Program Files\nodejs\npx.cmd'

function Write-Step($message) {
  Write-Host "[dev-android] $message"
}

function Get-ConnectedDevices {
  if (-not (Test-Path $adb)) {
    return @()
  }

  $lines = & $adb devices | Select-Object -Skip 1
  $devices = @()

  foreach ($line in $lines) {
    if ($line -match '^(?<serial>\S+)\s+device$') {
      $devices += $Matches.serial
    }
  }

  return $devices
}

function Wait-ForBoot($serial, [int]$TimeoutSeconds = 300) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    $state = (& $adb -s $serial shell getprop sys.boot_completed 2>$null | Out-String).Trim()

    if ($state -eq '1') {
      return $true
    }

    Start-Sleep -Seconds 5
  }

  return $false
}

function Test-MetroRunning([int]$Port) {
  try {
    $response = Invoke-WebRequest -Uri "http://localhost:$Port/status" -UseBasicParsing -TimeoutSec 5
    $content = $response.Content

    if ($content -is [byte[]]) {
      $content = [System.Text.Encoding]::UTF8.GetString($content)
    }

    return ("$content").Trim() -eq 'packager-status:running'
  }
  catch {
    return $false
  }
}

if (-not (Test-Path $adb)) {
  throw "No se encontro adb en $adb"
}

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$devices = @(Get-ConnectedDevices)

if ($devices.Count -eq 0) {
  Write-Step "Levantando el emulador $Avd"

  if (-not (Test-Path $emulator)) {
    throw "No se encontro el emulador en $emulator"
  }

  Start-Process -FilePath $emulator -ArgumentList '-avd', $Avd, '-no-boot-anim', '-gpu', 'swiftshader_indirect' -WorkingDirectory (Split-Path $emulator) -RedirectStandardOutput $emulatorLog -RedirectStandardError "$emulatorLog.error" -WindowStyle Hidden

  $deadline = (Get-Date).AddMinutes(5)

  do {
    Start-Sleep -Seconds 5
    $devices = @(Get-ConnectedDevices)
  } while ($devices.Count -eq 0 -and (Get-Date) -lt $deadline)

  if ($devices.Count -eq 0) {
    throw 'El emulador no se registro en adb'
  }

  Write-Step 'Esperando que termine de arrancar'

  if (-not (Wait-ForBoot $devices[0])) {
    throw 'El emulador no termino de arrancar'
  }
}

$serial = $devices[0]
Write-Step "Dispositivo disponible: $serial"

if (-not $SkipMetro) {
  if (Test-MetroRunning $MetroPort) {
    Write-Step "Metro ya estaba corriendo en el puerto $MetroPort"
  }
  else {
    Write-Step "Iniciando Metro en segundo plano (log: $metroLog)"

    $env:EXPO_NO_TELEMETRY = '1'

    Start-Process -FilePath $npx `
      -ArgumentList 'expo', 'start', '--port', $MetroPort `
      -WorkingDirectory $projectRoot `
      -RedirectStandardOutput $metroLog `
      -RedirectStandardError $metroErrorLog `
      -WindowStyle Hidden

    $deadline = (Get-Date).AddSeconds(90)

    do {
      Start-Sleep -Seconds 3
      $ready = Test-MetroRunning $MetroPort

      if (-not $ready -and (Test-Path $metroErrorLog)) {
        $metroError = Get-Content $metroErrorLog -Raw -ErrorAction SilentlyContinue

        if ($metroError -match 'is being used by another process') {
          throw "El puerto $MetroPort ya esta en uso. Cerrá el proceso que lo ocupa o usá -SkipMetro"
        }
      }
    } while (-not $ready -and (Get-Date) -lt $deadline)

    if (-not $ready) {
      throw "Metro no respondio en el puerto $MetroPort. Revisa $metroErrorLog"
    }

    Write-Step 'Metro listo'
  }

  & $adb -s $serial reverse "tcp:$MetroPort" "tcp:$MetroPort" | Out-Null
}

if (-not $SkipBuild) {
  if (-not (Test-Path $androidRoot)) {
    Write-Step 'Generando la carpeta android con expo prebuild'
    & $npx expo prebuild --platform android --no-install
  }

  Write-Step 'Preparando el entorno de build (rutas largas y ninja)'
  & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'setup-android.ps1') -SdkRoot $SdkRoot

  $gradleProperties = Join-Path $androidRoot 'gradle.properties'

  if (Test-Path $gradleProperties) {
    $content = Get-Content -LiteralPath $gradleProperties -Raw
    $content = [regex]::Replace($content, '(?m)^reactNativeArchitectures=.*$', "reactNativeArchitectures=$Architectures")
    Set-Content -LiteralPath $gradleProperties -Value $content -Encoding UTF8 -NoNewline
    Write-Step "Arquitecturas nativas: $Architectures"
  }

  Write-Step 'Compilando el APK de debug (incremental si no hubo cambios)'

  $env:JAVA_HOME = $JavaHome
  $env:ANDROID_HOME = $SdkRoot
  $env:ANDROID_SDK_ROOT = $SdkRoot

  & $gradlew assembleDebug --console=plain --no-daemon
}

if (-not $SkipInstall) {
  if (-not (Test-Path $apkPath)) {
    throw "No existe el APK en $apkPath. Compilalo primero o usá -SkipBuild con un APK existente"
  }

  Write-Step 'Instalando el APK'

  & $adb -s $serial install -r -t $apkPath | Write-Host
}

Write-Step 'Abriendo la app'

$appConfig = Get-Content (Join-Path $projectRoot 'app.json') -Raw | ConvertFrom-Json
$packageJson = Get-Content (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json
$hasDevClient = $null -ne $packageJson.dependencies.'expo-dev-client'

if ($hasDevClient) {
  $devClientUrl = "exp+$($appConfig.expo.slug)://expo-development-client/?url=http%3A%2F%2Flocalhost%3A$MetroPort"
  & $adb -s $serial shell am start -a android.intent.action.VIEW -d $devClientUrl | Write-Host
}
else {
  & $adb -s $serial shell am start -n "$Package/.MainActivity" | Write-Host
}

Write-Step "Listo. La app esta corriendo en $serial"
Write-Step "Log de Metro: $metroLog"
Write-Step 'Para ver la app: & "C:\AndroidSdk\emulator\emulator.exe" -avd Medium_Phone_API_37.0'
