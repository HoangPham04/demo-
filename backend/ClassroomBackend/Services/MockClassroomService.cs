using ClassroomBackend.Dtos;

namespace ClassroomBackend.Services;

public class MockClassroomService : IClassroomService
{
    private readonly List<CourseDto> _courses = new()
    {
        new CourseDto
        {
            Id = "course-1",
            Title = "Game Design",
            Code = "GD-001",
            Status = "Published",
            Category = "Roblox / Game Development",
            Students = 24,
            Progress = 68,
            LessonsCount = 5,
            LastSynced = "Just now",
            Description = "Students learn scripting, mobile adaptation, project sharing, and quiz-based review.",
            Lessons = new List<LessonDto>
            {
                new LessonDto
                {
                    Id = "lesson-4",
                    Title = "Lesson 4. Developing a Mobile Version of the Game",
                    Locked = false,
                    Activities = new List<ActivityDto>
                    {
                        new ActivityDto
                        {
                            Id = "act-17",
                            Number = 17,
                            Title = "Script for rotating the object",
                            Type = "content",
                            Status = "available",
                            Duration = "15 min",
                            Content = "Students write a simple script to rotate an object inside the game scene and understand motion behavior."
                        },
                        new ActivityDto
                        {
                            Id = "act-18",
                            Number = 18,
                            Title = "Script for determining the direction",
                            Type = "content",
                            Status = "completed",
                            Duration = "20 min",
                            Content = "Students use conditional logic to determine direction and object movement in a simple project."
                        },
                        new ActivityDto
                        {
                            Id = "act-19",
                            Number = 19,
                            Title = "Script for creating a mobile control",
                            Type = "content",
                            Status = "completed",
                            Duration = "25 min",
                            Content = "Students create a mobile control and test how gameplay changes on smaller screens."
                        },
                        new ActivityDto
                        {
                            Id = "act-20",
                            Number = 20,
                            Title = "Share the game",
                            Type = "project",
                            Status = "available",
                            Duration = "10 min",
                            Content = "Students export, share, and submit the project link for review."
                        }
                    }
                },
                new LessonDto
                {
                    Id = "lesson-5",
                    Title = "Lesson 5. Game Development: From Concept to Release",
                    Locked = false,
                    Activities = new List<ActivityDto>
                    {
                        new ActivityDto
                        {
                            Id = "act-21",
                            Number = 21,
                            Title = "Quiz: Facts about Roblox",
                            Type = "quiz",
                            Status = "available",
                            Duration = "8 min",
                            Questions = new List<QuestionDto>
                            {
                                new QuestionDto
                                {
                                    Id = "q1",
                                    Question = "Roblox games are primarily created using which language?",
                                    Options = new List<string> { "Lua", "Python", "Java", "C#" },
                                    CorrectAnswer = "Lua"
                                },
                                new QuestionDto
                                {
                                    Id = "q2",
                                    Question = "Roblox Studio is used to create Roblox experiences.",
                                    Options = new List<string> { "True", "False" },
                                    CorrectAnswer = "True"
                                },
                                new QuestionDto
                                {
                                    Id = "q3",
                                    Question = "A published course should appear on the student web portal.",
                                    Options = new List<string> { "True", "False" },
                                    CorrectAnswer = "True"
                                }
                            }
                        },
                        new ActivityDto
                        {
                            Id = "act-22",
                            Number = 22,
                            Title = "Development Team",
                            Type = "content",
                            Status = "locked",
                            Duration = "12 min",
                            Content = "Students learn the roles inside a basic game development team."
                        }
                    }
                }
            }
        },
        new CourseDto
        {
            Id = "course-2",
            Title = "Web Form Classroom Demo",
            Code = "WF-002",
            Status = "Draft",
            Category = "Internal Testing",
            Students = 6,
            Progress = 35,
            LessonsCount = 2,
            LastSynced = "Just now",
            Description = "Internal demo course used to test course sync, lesson rendering, quiz rendering, and progress tracking.",
            Lessons = new List<LessonDto>
            {
                new LessonDto
                {
                    Id = "lesson-sync",
                    Title = "Lesson 1. Classroom Sync Test",
                    Locked = false,
                    Activities = new List<ActivityDto>
                    {
                        new ActivityDto
                        {
                            Id = "sync-1",
                            Number = 1,
                            Title = "Course created from Classroom",
                            Type = "content",
                            Status = "available",
                            Duration = "5 min",
                            Content = "This activity simulates a course object synced from Classroom into the web app."
                        },
                        new ActivityDto
                        {
                            Id = "sync-2",
                            Number = 2,
                            Title = "Quiz Sync Test",
                            Type = "quiz",
                            Status = "available",
                            Duration = "5 min",
                            Questions = new List<QuestionDto>
                            {
                                new QuestionDto
                                {
                                    Id = "sq1",
                                    Question = "If a quiz is created in Classroom, should it appear on the web portal?",
                                    Options = new List<string> { "Yes", "No" },
                                    CorrectAnswer = "Yes"
                                },
                                new QuestionDto
                                {
                                    Id = "sq2",
                                    Question = "Draft content should be hidden from students.",
                                    Options = new List<string> { "True", "False" },
                                    CorrectAnswer = "True"
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    public List<CourseDto> GetCourses()
    {
        return _courses;
    }

    public CourseDto? GetCourseById(string id)
    {
        return _courses.FirstOrDefault(course => course.Id == id);
    }

    public void MarkAllCoursesSynced()
    {
        foreach (var course in _courses)
        {
            course.LastSynced = "Just now";
        }
    }
}