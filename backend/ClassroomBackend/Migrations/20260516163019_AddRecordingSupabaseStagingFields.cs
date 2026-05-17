using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClassroomBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddRecordingSupabaseStagingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TempStorageBucket",
                table: "RecordingSessions",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TempStoragePath",
                table: "RecordingSessions",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TempStorageProvider",
                table: "RecordingSessions",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TempStorageBucket",
                table: "RecordingSessions");

            migrationBuilder.DropColumn(
                name: "TempStoragePath",
                table: "RecordingSessions");

            migrationBuilder.DropColumn(
                name: "TempStorageProvider",
                table: "RecordingSessions");
        }
    }
}
