namespace Futbol.Api.DTOs.matches;

public record MatchResponse(
    Guid Id,
    DateTime Date,
    string? Opponent,
    int? Format,
    int? Goals,
    int? Assists,
    int? Result,   // 0=Perdido, 1=Empate, 2=Ganado
    bool IsMvp,
    string? Notes
);
