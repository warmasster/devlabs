<#
  relavops para Windows 10/11: crea una distro WSL2 propia ("relavops") y dentro instala todo.
  Uso (PowerShell normal, no hace falta administrador si WSL ya está instalado):
      powershell -ExecutionPolicy Bypass -File instalador\install.ps1
  Opciones: -Nombre relavops -Puerto 8080 -Abrir
  Se desinstala con:  wsl --unregister relavops
#>
param(
  [string]$Nombre = 'relavops',
  [int]$Puerto = 8080,
  [switch]$Abrir
)
$ErrorActionPreference = 'Stop'
$env:WSL_UTF8 = '1'
$t0 = Get-Date
function Paso($m) { Write-Host ("[relavops {0,4:n0}s] {1}" -f ((Get-Date) - $t0).TotalSeconds, $m) -ForegroundColor Green }
$origen = Split-Path -Parent $PSScriptRoot

# 1. WSL2
Paso 'Comprobando WSL2'
$estado = (wsl.exe --status 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0 -and $estado -notmatch 'WSL') {
  Write-Host 'WSL no está instalado. Ejecuta como administrador:  wsl --install --no-distribution  y reinicia.' -ForegroundColor Yellow
  exit 1
}

# 2. Distro propia (no toca las tuyas)
$distros = (wsl.exe -l -q) -replace "`0", '' | Where-Object { $_ }
$tDistro = 0
if ($distros -notcontains $Nombre) {
  Paso "Creando la distro WSL '$Nombre' (Ubuntu 24.04)"
  $t = Get-Date
  wsl.exe --install Ubuntu-24.04 --name $Nombre --no-launch | Out-Null
  if ($LASTEXITCODE) { throw 'No se pudo crear la distro WSL' }
  $tDistro = [int]((Get-Date) - $t).TotalSeconds
}

# 3. Instalar dentro (mismo install.sh que en Linux)
$ruta = '/mnt/' + $origen.Substring(0, 1).ToLower() + ($origen.Substring(2) -replace '\\', '/')
Paso 'Instalando motores, imágenes y labd dentro de WSL'
wsl.exe -d $Nombre -u root -- env RELAVOPS_PUERTO=$Puerto RELAVOPS_ORIGEN=$ruta bash "$ruta/instalador/install.sh"
if ($LASTEXITCODE) { throw 'Falló la instalación dentro de WSL' }

# 4. Mantener la distro despierta mientras se usa (WSL apaga las distros sin procesos)
wsl.exe -d $Nombre --terminate 2>$null | Out-Null  # aplica wsl.conf (sin PATH de Windows)
Start-Process -WindowStyle Hidden -FilePath wsl.exe -ArgumentList @('-d', $Nombre, '-u', 'root', '--', 'sh', '-c', 'systemctl start relavops; exec sleep infinity')
$lnk = Join-Path ([Environment]::GetFolderPath('Programs')) 'relavops.lnk'
$s = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)
$s.TargetPath = 'powershell.exe'
$s.Arguments = "-WindowStyle Hidden -Command `"Start-Process -WindowStyle Hidden wsl.exe '-d $Nombre -u root -- sh -c ''systemctl start relavops; exec sleep infinity'''; Start-Sleep 3; Start-Process http://localhost:$Puerto`""
$s.Save()

for ($i = 0; $i -lt 60; $i++) {
  try { if ((Invoke-RestMethod "http://localhost:$Puerto/api/estado" -TimeoutSec 2).calientes.'m1-terminal' -gt 0) { break } } catch {}
  Start-Sleep 1
}
$total = [int]((Get-Date) - $t0).TotalSeconds

# Resultado medido para la página M6 (lo sirve labd desde /var/lib/relavops/publico).
try {
  $OutputEncoding = New-Object System.Text.UTF8Encoding($false)
  $fl = (wsl.exe -d $Nombre -u root -- cat /var/lib/relavops/publico/instalacion/fases-linux.json) | ConvertFrom-Json
  $fases = @()
  if ($tDistro) { $fases += [pscustomobject]@{ nombre = 'Crear distro WSL (descarga Ubuntu)'; s = $tDistro } }
  $fases += $fl.fases
  $resto = $total - $tDistro - $fl.total_s
  if ($resto -gt 0) { $fases += [pscustomobject]@{ nombre = 'Arrancar el servicio en Windows'; s = $resto } }
  $win = (Get-CimInstance Win32_OperatingSystem).Caption
  $res = [pscustomobject]@{ fecha = (Get-Date -Format o); entorno = "$win + WSL2, distro nueva"; total_s = $total; fases = $fases
    nota = "Incluye las descargas de paquetes e imágenes base y la construcción de las imágenes de los labs. Ubuntu tardó $tDistro s: si WSL ya lo tenía en caché, en un equipo nuevo hay que sumar su descarga (unos 350 MB)." }
  $res | ConvertTo-Json -Depth 5 -Compress | wsl.exe -d $Nombre -u root -- sh -c "sed '1s/^\xEF\xBB\xBF//' > /var/lib/relavops/publico/instalacion/resultado.json"
} catch { Write-Host "No se pudo guardar el resultado: $_" -ForegroundColor Yellow }

Paso "Listo en $total s → http://localhost:$Puerto  (acceso directo 'relavops' en el menú Inicio)"
"RELAVOPS_LISTO_EN=$total"
if ($Abrir) { Start-Process "http://localhost:$Puerto" }
