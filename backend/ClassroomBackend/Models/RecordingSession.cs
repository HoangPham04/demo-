namespace ClassroomBackend.Models;

public class RecordingSession
{
    public int Id { get; set; }

    public string RecordingSessionId { get; set; } = Guid.NewGuid().ToString("N");

    public string MeetingCode { get; set; } = "";
    public string CalendarEventId { get; set; } = "";
    public string ClassName { get; set; } = "";
    public string TeacherEmail { get; set; } = "";

    // recording / stopped / uploading / uploaded / upload_failed / drive_missing / interrupted
    public string Status { get; set; } = "recording";

    public DateTimeOffset StartedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? StoppedAt { get; set; }

    public int DurationSeconds { get; set; }

    public string FileName { get; set; } = "";
    public long FileSizeBytes { get; set; }

    public string DriveFileId { get; set; } = "";
    public string DriveViewLink { get; set; } = "";
    public string DriveContentLink { get; set; } = "";
    public string DriveFolderId { get; set; } = "";

    public string UploadError { get; set; } = "";
    public string LastCheckError { get; set; } = "";

    public DateTimeOffset? LastCheckedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string TempFilePath { get; set; } = "";
public DateTimeOffset? StagedAt { get; set; }
public int UploadAttempts { get; set; } = 0;
public DateTimeOffset? LastUploadAttemptAt { get; set; }
}