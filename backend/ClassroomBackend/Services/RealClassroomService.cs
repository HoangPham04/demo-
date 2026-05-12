using ClassroomBackend.Dtos;

namespace ClassroomBackend.Services;

public class RealClassroomService : IClassroomService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<RealClassroomService> _logger;

    public RealClassroomService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<RealClassroomService> logger
    )
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public List<CourseDto> GetCourses()
    {
        // TODO:
        // 1. Read Classroom API base URL from appsettings.json
        // 2. Read token/API key from configuration
        // 3. Call real Classroom course endpoint
        // 4. Map real Classroom response to CourseDto
        // 5. Return mapped courses

        _logger.LogInformation("RealClassroomService.GetCourses called, but real API is not connected yet.");

        return new List<CourseDto>();
    }

    public CourseDto? GetCourseById(string id)
    {
        var courses = GetCourses();
        return courses.FirstOrDefault(course => course.Id == id);
    }

    public void MarkAllCoursesSynced()
    {
        // TODO:
        // In real mode, this may trigger a real Classroom sync.
        // For now, it only logs that the method was called.

        _logger.LogInformation("RealClassroomService.MarkAllCoursesSynced called, but real sync is not implemented yet.");
    }
}