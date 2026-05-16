using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClassroomBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddRecordingSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RecordingCronReports",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    StartedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    FinishedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    CheckedCount = table.Column<int>(type: "INTEGER", nullable: false),
                    UploadedCount = table.Column<int>(type: "INTEGER", nullable: false),
                    UploadFailedCount = table.Column<int>(type: "INTEGER", nullable: false),
                    DriveMissingCount = table.Column<int>(type: "INTEGER", nullable: false),
                    InterruptedCount = table.Column<int>(type: "INTEGER", nullable: false),
                    SyncedCount = table.Column<int>(type: "INTEGER", nullable: false),
                    DeletedOldUploadedCount = table.Column<int>(type: "INTEGER", nullable: false),
                    DeletedOldErrorCount = table.Column<int>(type: "INTEGER", nullable: false),
                    SummaryJson = table.Column<string>(type: "TEXT", nullable: false),
                    Error = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecordingCronReports", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RecordingSessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    RecordingSessionId = table.Column<string>(type: "TEXT", nullable: false),
                    MeetingCode = table.Column<string>(type: "TEXT", nullable: false),
                    CalendarEventId = table.Column<string>(type: "TEXT", nullable: false),
                    ClassName = table.Column<string>(type: "TEXT", nullable: false),
                    TeacherEmail = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    StoppedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    DurationSeconds = table.Column<int>(type: "INTEGER", nullable: false),
                    FileName = table.Column<string>(type: "TEXT", nullable: false),
                    FileSizeBytes = table.Column<long>(type: "INTEGER", nullable: false),
                    DriveFileId = table.Column<string>(type: "TEXT", nullable: false),
                    DriveViewLink = table.Column<string>(type: "TEXT", nullable: false),
                    DriveContentLink = table.Column<string>(type: "TEXT", nullable: false),
                    DriveFolderId = table.Column<string>(type: "TEXT", nullable: false),
                    UploadError = table.Column<string>(type: "TEXT", nullable: false),
                    LastCheckError = table.Column<string>(type: "TEXT", nullable: false),
                    LastCheckedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecordingSessions", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RecordingCronReports");

            migrationBuilder.DropTable(
                name: "RecordingSessions");
        }
    }
}