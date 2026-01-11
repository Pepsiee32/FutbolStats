namespace Futbol.Api.DTOs.matches;

public record CreateMatchRequest(
    DateTime Date,
    string? Opponent,
    int? Format,
    int? Goals,
    int? Assists,
    int? Result,
    bool IsMvp,
    string? Notes
);
