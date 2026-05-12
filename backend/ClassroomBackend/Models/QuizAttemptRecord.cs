namespace ClassroomBackend.Models;

public class QuizAttemptRecord
{
    public int Id { get; set; }
    public string CourseId { get; set; } = "";
    public string ActivityId { get; set; } = "";
    public int Score { get; set; }
    public DateTime SubmittedAt { get; set; }
}