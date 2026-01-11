namespace Futbol.Api.Models;

public class Match
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = default!;
    public DateTime Date { get; set; }
    public string? Opponent { get; set; }
    public int? Format { get; set; }
    public int? Goals { get; set; }
    public int? Assists { get; set; }
    public string? Notes { get; set; }
    public int? Result { get; set; }   // 0=Perdido, 1=Empatado, 2=Ganado (o el orden que quieras)
    public bool IsMvp { get; set; }    // default false


    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
