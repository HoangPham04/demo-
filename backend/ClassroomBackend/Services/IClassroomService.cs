using ClassroomBackend.Dtos;

namespace ClassroomBackend.Services;

public interface IClassroomService
{
    List<CourseDto> GetCourses();

    CourseDto? GetCourseById(string id);

    void MarkAllCoursesSynced();
}