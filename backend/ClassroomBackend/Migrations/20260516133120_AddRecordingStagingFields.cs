using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClassroomBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddRecordingStagingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastUploadAttemptAt",
                table: "RecordingSessions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "StagedAt",
                table: "RecordingSessions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TempFilePath",
                table: "RecordingSessions",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "UploadAttempts",
                table: "RecordingSessions",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastUploadAttemptAt",
                table: "RecordingSessions");

            migrationBuilder.DropColumn(
                name: "StagedAt",
                table: "RecordingSessions");

            migrationBuilder.DropColumn(
                name: "TempFilePath",
                table: "RecordingSessions");

            migrationBuilder.DropColumn(
                name: "UploadAttempts",
                table: "RecordingSessions");
        }
    }
}
