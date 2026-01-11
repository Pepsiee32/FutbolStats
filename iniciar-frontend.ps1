# Script para iniciar el frontend (Next.js)
# Ejecutar desde la raíz del proyecto: .\iniciar-frontend.ps1

Write-Host "Iniciando frontend (Next.js)..." -ForegroundColor Cyan

# Verificar que Node.js esté instalado
try {
    $nodeVersion = node --version 2>&1
    Write-Host "OK Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js no encontrado. Por favor instálalo desde: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Verificar que npm esté instalado
try {
    $npmVersion = npm --version 2>&1
    Write-Host "OK npm encontrado: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: npm no encontrado. Por favor instala Node.js desde: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Cambiar al directorio del frontend
$frontendPath = "web"
if (-not (Test-Path $frontendPath)) {
    Write-Host "ERROR: No se encontro el directorio $frontendPath" -ForegroundColor Red
    exit 1
}

Set-Location $frontendPath

# Verificar si node_modules existe, si no, instalar dependencias
if (-not (Test-Path "node_modules")) {
    Write-Host "`nInstalando dependencias..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Error al instalar dependencias." -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Write-Host "OK Dependencias instaladas." -ForegroundColor Green
}

Write-Host "`nIniciando servidor de desarrollo en http://localhost:3000..." -ForegroundColor Cyan
Write-Host "Presiona Ctrl+C para detener el servidor" -ForegroundColor Yellow
Write-Host ""

# Iniciar el servidor de desarrollo
npm run dev
