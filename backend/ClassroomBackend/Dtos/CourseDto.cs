namespace ClassroomBackend.Dtos;

public class CourseDto
{
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public string Code { get; set; } = "";
    public string Status { get; set; } = "";
    public string Category { get; set; } = "";
    public int Students { get; set; }
    public int Progress { get; set; }
    public int LessonsCount { get; set; }
    public string LastSynced { get; set; } = "";
    public string Description { get; set; } = "";
    public List<LessonDto> Lessons { get; set; } = new();
}

public class LessonDto
{
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public bool Locked { get; set; }
    public List<ActivityDto> Activities { get; set; } = new();
}

public class ActivityDto
{
    public string Id { get; set; } = "";
    public int Number { get; set; }
    public string Title { get; set; } = "";
    public string Type { get; set; } = "";
    public string Status { get; set; } = "";
    public string Duration { get; set; } = "";
    public string Content { get; set; } = "";
    public List<QuestionDto> Questions { get; set; } = new();
}

public class QuestionDto
{
    public string Id { get; set; } = "";
    public string Question { get; set; } = "";
    public List<string> Options { get; set; } = new();
    public string CorrectAnswer { get; set; } = "";
}