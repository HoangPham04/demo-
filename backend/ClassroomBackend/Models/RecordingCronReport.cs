namespace ClassroomBackend.Models;

public class RecordingCronReport
{
    public int Id { get; set; }

    public DateTimeOffset StartedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? FinishedAt { get; set; }

    public int CheckedCount { get; set; }
    public int UploadedCount { get; set; }
    public int UploadFailedCount { get; set; }
    public int DriveMissingCount { get; set; }
    public int InterruptedCount { get; set; }
    public int SyncedCount { get; set; }
    public int DeletedOldUploadedCount { get; set; }
    public int DeletedOldErrorCount { get; set; }

    public string SummaryJson { get; set; } = "";
    public string Error { get; set; } = "";
}