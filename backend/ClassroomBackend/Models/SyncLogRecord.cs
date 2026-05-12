namespace ClassroomBackend.Models;

public class SyncLogRecord
{
    public int Id { get; set; }
    public string Time { get; set; } = "";
    public string Object { get; set; } = "";
    public string Action { get; set; } = "";
    public string Status { get; set; } = "";
    public string Message { get; set; } = "";
}