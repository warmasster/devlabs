# Compila el muestrario: web (Vite) + labs + labd (binario Linux único) en dist/.
param([switch]$SinWeb)
$ErrorActionPreference = 'Stop'
$raiz = $PSScriptRoot

if (-not $SinWeb -and (Test-Path "$raiz\web\package.json")) {
  Push-Location "$raiz\web"
  try { npm run build --silent; if ($LASTEXITCODE) { throw "fallo en npm run build" } } finally { Pop-Location }
}

$labd = "$raiz\labd"
Remove-Item -Recurse -Force "$labd\webdist", "$labd\labsdist" -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force "$labd\webdist", "$labd\labsdist" | Out-Null
if (Test-Path "$raiz\web\dist") { Copy-Item -Recurse "$raiz\web\dist\*" "$labd\webdist\" }
else { 'muestrario sin web' | Out-File -Encoding utf8 "$labd\webdist\index.html" }
Copy-Item -Recurse "$raiz\labs\*" "$labd\labsdist\"

$env:GOOS = 'linux'; $env:GOARCH = 'amd64'; $env:CGO_ENABLED = '0'
# La versión es la fecha de compilación. Sale en el panel de admin, en Servidores.
$version = Get-Date -Format 'yyyy.MM.dd-HHmm'
go -C $labd build -trimpath -ldflags "-s -w -X main.version=$version" -o "$raiz\dist\labd" .
if ($LASTEXITCODE) { throw "fallo compilando labd" }
Remove-Item Env:GOOS, Env:GOARCH, Env:CGO_ENABLED
$mb = [math]::Round((Get-Item "$raiz\dist\labd").Length / 1MB, 1)
Write-Host "dist/labd listo ($mb MB)"
