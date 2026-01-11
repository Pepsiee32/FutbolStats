using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Futbol.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddResultAndMvpToMatch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsMvp",
                table: "Matches",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "Result",
                table: "Matches",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsMvp",
                table: "Matches");

            migrationBuilder.DropColumn(
                name: "Result",
                table: "Matches");
        }
    }
}
