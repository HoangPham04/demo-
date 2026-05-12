namespace ClassroomBackend.Dtos;

public class QuizAttemptDto
{
    public string CourseId { get; set; } = "";
    public string ActivityId { get; set; } = "";
    public int Score { get; set; }
}