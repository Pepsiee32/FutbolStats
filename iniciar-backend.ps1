# Script para iniciar el backend API
# Ejecutar desde la raíz del proyecto: .\iniciar-backend.ps1

Write-Host "Iniciando backend API..." -ForegroundColor Cyan

# Verificar que dotnet esté instalado
try {
    $dotnetVersion = dotnet --version 2>&1
    Write-Host "OK .NET SDK encontrado: $dotnetVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: .NET SDK no encontrado. Por favor instálalo primero." -ForegroundColor Red
    Write-Host "Ver instrucciones en: INSTALAR_DOTNET.md" -ForegroundColor Yellow
    exit 1
}

# Cambiar al directorio del proyecto
$projectPath = "api\Futbol.Api"
if (-not (Test-Path $projectPath)) {
    Write-Host "ERROR: No se encontro el directorio $projectPath" -ForegroundColor Red
    exit 1
}

Write-Host "`nCompilando el proyecto..." -ForegroundColor Cyan
Set-Location $projectPath
dotnet build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Error al compilar el proyecto." -ForegroundColor Red
    Set-Location ..\..
    exit 1
}
Write-Host "OK Proyecto compilado exitosamente." -ForegroundColor Green

Write-Host "`nIniciando servidor en http://localhost:5247..." -ForegroundColor Cyan
Write-Host "Presiona Ctrl+C para detener el servidor" -ForegroundColor Yellow
Write-Host ""

# Iniciar el servidor
dotnet run --launch-profile http
