# Script para instalar .NET SDK y ejecutar migraciones
# Ejecutar desde la raiz del proyecto: .\instalar-y-ejecutar-migraciones.ps1

Write-Host "Instalando .NET SDK y ejecutando migraciones..." -ForegroundColor Cyan

# Verificar si dotnet ya esta instalado
try {
    $dotnetVersion = dotnet --version 2>&1
    Write-Host "OK .NET SDK ya esta instalado: $dotnetVersion" -ForegroundColor Green
    $dotnetInstalled = $true
} catch {
    Write-Host "ATENCION: .NET SDK no encontrado. Instalando..." -ForegroundColor Yellow
    $dotnetInstalled = $false
}

# Instalar .NET SDK si no esta instalado
if (-not $dotnetInstalled) {
    Write-Host ""
    Write-Host "Instalando .NET SDK 9.0 usando winget..." -ForegroundColor Cyan
    Write-Host "Esto puede tardar varios minutos..." -ForegroundColor Gray
    
    winget install Microsoft.DotNet.SDK.9 --accept-package-agreements --accept-source-agreements --silent
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Error al instalar .NET SDK" -ForegroundColor Red
        Write-Host "Intenta instalarlo manualmente desde: https://dotnet.microsoft.com/download" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "OK .NET SDK instalado" -ForegroundColor Green
           Write-Host "ATENCION: Por favor, cierra y vuelve a abrir esta terminal para que los cambios surtan efecto." -ForegroundColor Yellow
           Write-Host "Luego ejecuta este script nuevamente: .\instalar-y-ejecutar-migraciones.ps1" -ForegroundColor Yellow
    exit 0
}

# Verificar que dotnet-ef este instalado
Write-Host ""
Write-Host "Verificando herramientas de Entity Framework..." -ForegroundColor Cyan
try {
    dotnet ef --version 2>&1 | Out-Null
    Write-Host "OK dotnet-ef encontrado" -ForegroundColor Green
} catch {
    Write-Host "ATENCION: Instalando dotnet-ef..." -ForegroundColor Yellow
    dotnet tool install --global dotnet-ef
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Error al instalar dotnet-ef" -ForegroundColor Red
        exit 1
    }
    Write-Host "OK dotnet-ef instalado" -ForegroundColor Green
}

# Cambiar al directorio del proyecto
$projectPath = "api\Futbol.Api"
if (-not (Test-Path $projectPath)) {
    Write-Host "ERROR: No se encontro el directorio $projectPath" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Ejecutando migraciones contra base de datos remota (Neon)..." -ForegroundColor Cyan
Write-Host "Base de datos: Neon (remota)" -ForegroundColor Gray
Write-Host "Cadena de conexion: appsettings.json" -ForegroundColor Gray
Write-Host ""

# Ejecutar las migraciones
Set-Location $projectPath
dotnet ef database update

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "OK Migraciones ejecutadas exitosamente!" -ForegroundColor Green
    Write-Host "Las tablas se han creado/actualizado en tu base de datos Neon." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "ERROR: Error al ejecutar las migraciones" -ForegroundColor Red
    Write-Host "Verifica la cadena de conexion en appsettings.json" -ForegroundColor Yellow
    exit 1
}

# Volver al directorio raiz
Set-Location ..\..

Write-Host ""
Write-Host "Proceso completado!" -ForegroundColor Green
