# Script para configurar el entorno de desarrollo
# Ejecutar desde la raíz del proyecto: .\setup-env.ps1

Write-Host "Configurando entorno de desarrollo..." -ForegroundColor Green

# Crear .env.local en web/
$envContent = @"
NEXT_PUBLIC_API_URL=http://localhost:5247

# Recommended for most uses
DATABASE_URL=postgresql://neondb_owner:npg_TiHxNGv3a1hX@ep-calm-poetry-adpqicy6-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# For uses requiring a connection without pgbouncer
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:npg_TiHxNGv3a1hX@ep-calm-poetry-adpqicy6.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# Parameters for constructing your own connection string
PGHOST=ep-calm-poetry-adpqicy6-pooler.c-2.us-east-1.aws.neon.tech
PGHOST_UNPOOLED=ep-calm-poetry-adpqicy6.c-2.us-east-1.aws.neon.tech
PGUSER=neondb_owner
PGDATABASE=neondb
PGPASSWORD=npg_TiHxNGv3a1hX

# Parameters for Vercel Postgres Templates
POSTGRES_URL=postgresql://neondb_owner:npg_TiHxNGv3a1hX@ep-calm-poetry-adpqicy6-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
POSTGRES_URL_NON_POOLING=postgresql://neondb_owner:npg_TiHxNGv3a1hX@ep-calm-poetry-adpqicy6.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
POSTGRES_USER=neondb_owner
POSTGRES_HOST=ep-calm-poetry-adpqicy6-pooler.c-2.us-east-1.aws.neon.tech
POSTGRES_PASSWORD=npg_TiHxNGv3a1hX
POSTGRES_DATABASE=neondb
POSTGRES_URL_NO_SSL=postgresql://neondb_owner:npg_TiHxNGv3a1hX@ep-calm-poetry-adpqicy6-pooler.c-2.us-east-1.aws.neon.tech/neondb
POSTGRES_PRISMA_URL=postgresql://neondb_owner:npg_TiHxNGv3a1hX@ep-calm-poetry-adpqicy6-pooler.c-2.us-east-1.aws.neon.tech/neondb?connect_timeout=15&sslmode=require

# Neon Auth environment variables for Next.js
NEXT_PUBLIC_STACK_PROJECT_ID=**********
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=**************
STACK_SECRET_SERVER_KEY=*********
"@

$envPath = "web\.env.local"
if (Test-Path $envPath) {
    Write-Host "El archivo .env.local ya existe. ¿Deseas sobrescribirlo? (S/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -ne "S" -and $response -ne "s") {
        Write-Host "Operación cancelada." -ForegroundColor Yellow
        exit
    }
}

Set-Content -Path $envPath -Value $envContent -Encoding UTF8
Write-Host "✅ Archivo .env.local creado en web/" -ForegroundColor Green

Write-Host "`nPróximos pasos:" -ForegroundColor Cyan
Write-Host "1. Ejecutar migraciones: cd api\Futbol.Api && dotnet ef database update" -ForegroundColor White
Write-Host "2. Iniciar backend: cd api\Futbol.Api && dotnet run" -ForegroundColor White
Write-Host "3. Iniciar frontend: cd web && npm run dev" -ForegroundColor White
