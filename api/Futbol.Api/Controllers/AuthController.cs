using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using Futbol.Api.DTOs;
using Futbol.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Logging;

namespace Futbol.Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _users;
    private readonly IConfiguration _cfg;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<AuthController> _logger;

    public AuthController(UserManager<ApplicationUser> users, IConfiguration cfg, IWebHostEnvironment env, ILogger<AuthController> logger)
    {
        _users = users;
        _cfg = cfg;
        _env = env;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Email y contraseña son requeridos" });

        // Validación básica de email
        var emailRegex = new Regex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.IgnoreCase);
        if (!emailRegex.IsMatch(req.Email))
            return BadRequest(new { message = "El formato del email no es válido" });

        // Sanitizar email (trim y lowercase)
        var sanitizedEmail = req.Email.Trim().ToLowerInvariant();

        var user = new ApplicationUser
        {
            UserName = sanitizedEmail,
            Email = sanitizedEmail
        };

        var result = await _users.CreateAsync(user, req.Password);
        if (!result.Succeeded)
        {
            // Devolver errores en formato que el frontend pueda parsear
            var errors = result.Errors.Select(e => new { code = e.Code, description = e.Description }).ToArray();
            return BadRequest(new { errors });
        }

        return Ok();
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
                return BadRequest(new { message = "Email y contraseña son requeridos" });

            // Sanitizar email (trim y lowercase) para que coincida con Register
            var sanitizedEmail = req.Email.Trim().ToLowerInvariant();

            _logger.LogInformation("Intentando login para: {Email}", sanitizedEmail);

            var user = await _users.FindByEmailAsync(sanitizedEmail);
            if (user is null)
            {
                _logger.LogWarning("Usuario no encontrado: {Email}", sanitizedEmail);
                return Unauthorized(new { message = "Usuario no encontrado" });
            }

            var ok = await _users.CheckPasswordAsync(user, req.Password);
            if (!ok)
            {
                _logger.LogWarning("Contraseña incorrecta para: {Email}", sanitizedEmail);
                return Unauthorized(new { message = "Contraseña incorrecta" });
            }

            _logger.LogInformation("Credenciales válidas, creando JWT para: {Email}", sanitizedEmail);

            string token;
            try
            {
                token = CreateJwt(user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al crear JWT para: {Email}", sanitizedEmail);
                return StatusCode(500, new { message = "Error al generar token de autenticación" });
            }

            var isProduction = _env.IsProduction();
            // En Render y otros servicios cloud, verificar headers de proxy para HTTPS
            var forwardedProto = Request.Headers["X-Forwarded-Proto"].ToString();
            var isHttps = Request.IsHttps 
                || (!string.IsNullOrEmpty(forwardedProto) && forwardedProto.Equals("https", StringComparison.OrdinalIgnoreCase))
                || isProduction; // En producción, asumir HTTPS

            _logger.LogInformation("Configurando cookie. IsProduction: {IsProd}, IsHttps: {IsHttps}, ForwardedProto: {ForwardedProto}, Request.IsHttps: {RequestIsHttps}", 
                isProduction, isHttps, forwardedProto, Request.IsHttps);

            try
            {
                var expiresMinutes = int.Parse(_cfg["Jwt:ExpiresMinutes"] ?? _cfg["JWT_EXPIRES_MINUTES"] ?? "4320");
                
                var cookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    SameSite = isHttps ? SameSiteMode.None : SameSiteMode.Lax, // None para HTTPS cross-origin
                    Secure = isHttps, // Secure en HTTPS
                    Path = "/",
                    MaxAge = TimeSpan.FromMinutes(expiresMinutes)
                    // NO especificar Domain - permite que la cookie funcione en cross-origin
                };
                
                Response.Cookies.Append("auth_token", token, cookieOptions);
                
                // Asegurar que los headers CORS estén presentes
                Response.Headers.Append("Access-Control-Allow-Credentials", "true");

                _logger.LogInformation("Login exitoso para: {Email}. Cookie configurada: SameSite={SameSite}, Secure={Secure}", 
                    sanitizedEmail, cookieOptions.SameSite, cookieOptions.Secure);
                
                // Retornar el token en la respuesta como fallback para móviles (especialmente Safari iOS)
                // El frontend lo usará si la cookie no funciona
                return Ok(new { token });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al establecer cookie para: {Email}", sanitizedEmail);
                return StatusCode(500, new { message = "Error al establecer sesión" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error inesperado en Login");
            return StatusCode(500, new { message = "Error interno del servidor", error = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me()
    {
        // Logging para debugging - usar Warning para que aparezca en Render
        var hasCookie = Request.Cookies.TryGetValue("auth_token", out var cookieToken);
        var authHeader = Request.Headers["Authorization"].ToString();
        var hasHeader = !string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase);
        
        _logger.LogWarning("🔍 /auth/me llamado. Cookie: {HasCookie}, Header: {HasHeader}, User autenticado: {IsAuthenticated}", 
            hasCookie, hasHeader, User.Identity?.IsAuthenticated ?? false);
        
        if (!hasCookie && !hasHeader)
        {
            _logger.LogWarning("⚠️ /auth/me: NO cookie NI header Authorization. Cookies: {Cookies}, Headers: {AuthHeader}", 
                string.Join(", ", Request.Cookies.Keys), authHeader);
        }
        
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
        var email  = User.FindFirstValue(ClaimTypes.Email) ?? "";
        
        if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(email))
        {
            _logger.LogError("❌ /auth/me: Usuario autenticado pero claims vacíos. UserId: {UserId}, Email: {Email}", userId, email);
            return Unauthorized(new { message = "Token inválido o expirado" });
        }
        
        _logger.LogWarning("✅ /auth/me exitoso para: {Email}", email);
        return Ok(new { id = userId, email });
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        var isProduction = _env.IsProduction();
        // En Render y otros servicios cloud, verificar headers de proxy para HTTPS
        var forwardedProto = Request.Headers["X-Forwarded-Proto"].ToString();
        var isHttps = Request.IsHttps 
            || (!string.IsNullOrEmpty(forwardedProto) && forwardedProto.Equals("https", StringComparison.OrdinalIgnoreCase))
            || isProduction; // En producción, asumir HTTPS

        Response.Cookies.Delete("auth_token", new CookieOptions
        {
            HttpOnly = true,
            SameSite = isHttps ? SameSiteMode.None : SameSiteMode.Lax,
            Secure = isHttps,
            Path = "/"
        });
        return Ok();
    }

    private string CreateJwt(ApplicationUser user)
    {
        var key = _cfg["Jwt:Key"] 
            ?? _cfg["JWT_KEY"]
            ?? throw new InvalidOperationException("JWT Key no configurada");
        
        if (string.IsNullOrWhiteSpace(key))
            throw new InvalidOperationException("JWT Key está vacía");
        
        if (key.Length < 32)
        {
            _logger.LogWarning("JWT Key tiene menos de 32 caracteres. Longitud: {Length}", key.Length);
            // En producción, esto debería ser un error, pero por ahora solo logueamos
        }

        var issuer = _cfg["Jwt:Issuer"] 
            ?? _cfg["JWT_ISSUER"]
            ?? "Futbol.Api";
        var audience = _cfg["Jwt:Audience"] 
            ?? _cfg["JWT_AUDIENCE"]
            ?? "Futbol.Web";
        var expiresMinStr = _cfg["Jwt:ExpiresMinutes"] ?? _cfg["JWT_EXPIRES_MINUTES"] ?? "4320";
        
        if (!int.TryParse(expiresMinStr, out var expiresMin))
        {
            _logger.LogWarning("No se pudo parsear ExpiresMinutes: {Value}, usando 4320 por defecto", expiresMinStr);
            expiresMin = 4320;
        }

        if (string.IsNullOrWhiteSpace(user.Id))
            throw new InvalidOperationException("User Id no puede estar vacío");
        
        if (string.IsNullOrWhiteSpace(user.Email))
            throw new InvalidOperationException("User Email no puede estar vacío");

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email)
        };

        try
        {
            var keyBytes = Encoding.UTF8.GetBytes(key);
            var creds = new SigningCredentials(
                new SymmetricSecurityKey(keyBytes),
                SecurityAlgorithms.HmacSha256);

            var jwt = new JwtSecurityToken(
                issuer,
                audience,
                claims,
                expires: DateTime.UtcNow.AddMinutes(expiresMin),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(jwt);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al crear JWT. Key length: {KeyLength}, Issuer: {Issuer}, Audience: {Audience}", 
                key.Length, issuer, audience);
            throw;
        }
    }
}
