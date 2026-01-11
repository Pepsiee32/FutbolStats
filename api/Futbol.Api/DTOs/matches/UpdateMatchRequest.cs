namespace Futbol.Api.DTOs.matches;

public record UpdateMatchRequest(
    DateTime Date,
    string? Opponent,
    int? Format,
    int? Goals,
    int? Assists,
    int? Result,
    bool IsMvp,
    string? Notes
);
