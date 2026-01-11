# Instalación de .NET SDK

## Problema
El comando `dotnet` no se reconoce, lo que significa que el SDK de .NET no está instalado o no está en el PATH.

## Solución 1: Instalar .NET SDK (Recomendado)

### Opción A: Descargar desde el sitio oficial
1. Ve a: https://dotnet.microsoft.com/download
2. Descarga el **.NET SDK 9.0** (o la versión más reciente)
3. Ejecuta el instalador
4. Reinicia PowerShell/terminal después de la instalación

### Opción B: Usar winget (Windows Package Manager)
```powershell
winget install Microsoft.DotNet.SDK.9
```

### Opción C: Usar Chocolatey
```powershell
choco install dotnet-9.0-sdk
```

## Solución 2: Verificar si .NET está instalado pero no en PATH

Si .NET está instalado pero no está en el PATH, puedes:

### Opción A: Agregar al PATH manualmente
1. Busca dónde está instalado (generalmente `C:\Program Files\dotnet`)
2. Agrega esa carpeta al PATH del sistema:
   - Abre "Variables de entorno" desde el Panel de Control
   - Edita la variable PATH
   - Agrega: `C:\Program Files\dotnet`

### Opción B: Usar la ruta completa temporalmente
```powershell
& "C:\Program Files\dotnet\dotnet.exe" --version
```

Si funciona, puedes crear un alias:
```powershell
Set-Alias dotnet "C:\Program Files\dotnet\dotnet.exe"
```

## Verificar la instalación

Después de instalar, verifica con:
```powershell
dotnet --version
```

Deberías ver algo como: `9.0.xxx`

## Ejecutar las migraciones

Una vez que `dotnet` esté disponible:

```powershell
cd api\Futbol.Api
dotnet ef database update
```

## Nota sobre Entity Framework Tools

Si obtienes un error sobre `dotnet ef`, necesitas instalar las herramientas de EF Core:

```powershell
dotnet tool install --global dotnet-ef
```

## Alternativa: Usar Visual Studio

Si tienes Visual Studio instalado, puedes:
1. Abrir el proyecto en Visual Studio
2. Abrir la "Consola del Administrador de Paquetes" (Package Manager Console)
3. Ejecutar: `Update-Database`
