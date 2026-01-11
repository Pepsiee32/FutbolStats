using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Futbol.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveLocationFromMatches : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Location",
                table: "Matches");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "Matches",
                type: "text",
                nullable: true);
        }
    }
}
