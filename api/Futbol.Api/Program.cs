using System.Text;
using Futbol.Api.Data;
using Futbol.Api.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Identity (usuarios)
builder.Services
    .AddIdentity<ApplicationUser, IdentityRole>(opt =>
    {
        opt.Password.RequireNonAlphanumeric = false;
        opt.User.RequireUniqueEmail = true;

        // (Opcional) Si querés permitir passwords simples tipo "1234",
        // descomentá estas líneas:
        // opt.Password.RequireDigit = false;
        // opt.Password.RequireLowercase = false;
        // opt.Password.RequireUppercase = false;
        // opt.Password.RequiredLength = 4;
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

// ✅ IMPORTANTE: evitar redirects tipo /Account/Login en APIs.
// En vez de redirigir, devolvemos 401/403.
builder.Services.ConfigureApplicationCookie(opt =>
{
    opt.Events.OnRedirectToLogin = ctx =>
    {
        ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };

    opt.Events.OnRedirectToAccessDenied = ctx =>
    {
        ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
});

// JWT (validación + lectura desde cookie)
var jwtKey = builder.Configuration["Jwt:Key"] 
    ?? builder.Configuration["JWT_KEY"]
    ?? "PRODUCTION_CHANGE_ME_TO_A_SECURE_RANDOM_KEY_AT_LEAST_32_CHARACTERS_LONG";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] 
    ?? builder.Configuration["JWT_ISSUER"]
    ?? "Futbol.Api";
var jwtAudience = builder.Configuration["Jwt:Audience"] 
    ?? builder.Configuration["JWT_AUDIENCE"]
    ?? "Futbol.Web";

// ✅ CLAVE: forzar que [Authorize] use JWT (no cookie de Identity)
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(opt =>
{
    opt.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew = TimeSpan.FromMinutes(2)
    };

    // JWT en cookie: auth_token
    opt.Events = new JwtBearerEvents
    {
        OnMessageReceived = ctx =>
        {
            var logger = ctx.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
            var hasCookie = ctx.Request.Cookies.TryGetValue("auth_token", out var token);
            
            if (hasCookie && !string.IsNullOrEmpty(token))
            {
                ctx.Token = token;
                logger.LogWarning("🔐 JWT Bearer: Cookie 'auth_token' encontrada en request a {Path}", ctx.Request.Path);
            }
            else
            {
                logger.LogWarning("⚠️ JWT Bearer: Cookie 'auth_token' NO encontrada en request a {Path}. Cookies disponibles: {Cookies}", 
                    ctx.Request.Path, string.Join(", ", ctx.Request.Cookies.Keys));
                
                // Intentar leer desde header como fallback (útil para móviles)
                var authHeader = ctx.Request.Headers["Authorization"].ToString();
                if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    var headerToken = authHeader.Substring("Bearer ".Length).Trim();
                    ctx.Token = headerToken;
                    logger.LogWarning("✅ JWT Bearer: Token encontrado en header Authorization para {Path}", ctx.Request.Path);
                }
                else
                {
                    logger.LogWarning("❌ JWT Bearer: NO se encontró ni cookie ni header Authorization en request a {Path}", ctx.Request.Path);
                }
            }

            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// Configurar CORS - leer orígenes desde configuración y agregar dominios de Vercel
var configOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
    ?? new[] { "http://localhost:3000" };

// Agregar todos los dominios de Vercel conocidos
var allOrigins = new List<string>(configOrigins)
{
    "http://localhost:3000",
    "https://statsfutbolpro.vercel.app",
    "https://futbol-saas-posta.vercel.app"
};

// Remover duplicados
var uniqueOrigins = allOrigins.Distinct().ToArray();

builder.Services.AddCors(opt =>
{
    opt.AddPolicy("web", p =>
    {
        p.WithOrigins(uniqueOrigins)
         .AllowAnyHeader()
         .AllowAnyMethod()
         .AllowCredentials();
    });
});

var app = builder.Build();

// CORS debe estar ANTES de cualquier otro middleware
app.UseCors("web");

// Manejo de errores que también respeta CORS
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        var exceptionHandler = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
        var exception = exceptionHandler?.Error;

        if (exception != null)
        {
            logger.LogError(exception, "Error no manejado: {Message}", exception.Message);
        }

        // Asegurar que los headers CORS estén presentes incluso en errores
        var corsService = context.RequestServices.GetRequiredService<Microsoft.AspNetCore.Cors.Infrastructure.ICorsService>();
        var corsPolicyProvider = context.RequestServices.GetRequiredService<Microsoft.AspNetCore.Cors.Infrastructure.ICorsPolicyProvider>();
        var policy = await corsPolicyProvider.GetPolicyAsync(context, "web");
        if (policy != null)
        {
            var corsResult = corsService.EvaluatePolicy(context, policy);
            corsService.ApplyResult(corsResult, context.Response);
        }
        
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        
        var isDevelopment = app.Environment.IsDevelopment();
        var errorMessage = isDevelopment && exception != null
            ? $"{{\"error\":\"Internal server error\",\"message\":\"{exception.Message}\",\"type\":\"{exception.GetType().Name}\"}}"
            : "{\"error\":\"Internal server error\"}";
        
        await context.Response.WriteAsync(errorMessage);
    });
});

// app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapGet("/ping", () => Results.Ok("ok"));

// Debug endpoints solo en desarrollo
if (app.Environment.IsDevelopment())
{
    app.MapGet("/debug/matches", () => "matches route alive");

    app.MapGet("/debug/routes", (IEnumerable<Microsoft.AspNetCore.Routing.EndpointDataSource> sources) =>
    {
        var routes = sources
            .SelectMany(s => s.Endpoints)
            .OfType<Microsoft.AspNetCore.Routing.RouteEndpoint>()
            .Select(e => "/" + (e.RoutePattern.RawText ?? "").TrimStart('/'))
            .OrderBy(x => x)
            .ToList();

        return Results.Ok(routes);
    });
}

// Configurar puerto dinámico para Render y otros servicios cloud
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
{
    app.Urls.Add($"http://0.0.0.0:{port}");
}

app.Run();
