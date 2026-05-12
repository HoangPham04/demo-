using ClassroomBackend.Data;
using ClassroomBackend.Dtos;
using ClassroomBackend.Models;
using ClassroomBackend.Services;
using Microsoft.EntityFrameworkCore;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Classroom.v1;
using Google.Apis.Classroom.v1.Data;
using Google.Apis.Services;
using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using Google.Apis.Util.Store;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Globalization;

var builder = WebApplication.CreateBuilder(args);

var frontendUrl =
    builder.Configuration["FrontendUrl"]
    ?? Environment.GetEnvironmentVariable("FRONTEND_URL")
    ?? "http://localhost:5173";

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins(frontendUrl, "http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
var appDataDir =
    builder.Configuration["AppDataDir"]
    ?? Environment.GetEnvironmentVariable("APP_DATA_DIR")
    ?? builder.Environment.ContentRootPath;

Directory.CreateDirectory(appDataDir);

builder.Services.AddDbContext<ClassroomDbContext>(options =>
{
    var dbPath = Path.Combine(appDataDir, "classroom-demo.db");
    options.UseSqlite($"Data Source={dbPath}");
});

builder.Services.AddSingleton<IClassroomService, MockClassroomService>();

var app = builder.Build();

app.UseCors("AllowFrontend");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ClassroomDbContext>();
    db.Database.EnsureCreated();

    if (!db.SyncLogs.Any())
    {
        db.SyncLogs.Add(new SyncLogRecord
        {
            Time = DateTime.Now.ToString("HH:mm"),
            Object = "Backend",
            Action = "Startup",
            Status = "Success",
            Message = "C# backend database initialized successfully."
        });

        db.SaveChanges();
    }
}

app.MapGet("/api/health", () =>
{
    return Results.Ok(new
    {
        status = "OK",
        message = "ClassroomBackend is running"
    });
});

app.MapGet("/api/courses", (IClassroomService classroomService) =>
{
    return Results.Ok(classroomService.GetCourses());
});

app.MapGet("/api/courses/{id}", (string id, IClassroomService classroomService) =>
{
    var course = classroomService.GetCourseById(id);

    if (course == null)
    {
        return Results.NotFound(new
        {
            message = "Course not found"
        });
    }

    return Results.Ok(course);
});

app.MapGet("/api/logs", async (ClassroomDbContext db) =>
{
    var logs = await db.SyncLogs
        .OrderByDescending(log => log.Id)
        .Take(100)
        .ToListAsync();

    return Results.Ok(logs);
});

app.MapGet("/api/quiz-attempts", async (ClassroomDbContext db) =>
{
    var attempts = await db.QuizAttempts
        .OrderByDescending(attempt => attempt.Id)
        .Take(100)
        .ToListAsync();

    return Results.Ok(attempts);
});

app.MapPost("/api/sync", async (
    ClassroomDbContext db,
    IClassroomService classroomService
) =>
{
    classroomService.MarkAllCoursesSynced();

    var newLog = new SyncLogRecord
    {
        Time = DateTime.Now.ToString("HH:mm"),
        Object = "Classroom",
        Action = "Manual Sync",
        Status = "Success",
        Message = "Manual sync completed and saved into SQLite database."
    };

    db.SyncLogs.Add(newLog);
    await db.SaveChangesAsync();

    var logs = await db.SyncLogs
        .OrderByDescending(log => log.Id)
        .Take(100)
        .ToListAsync();

    return Results.Ok(new
    {
        message = "Sync completed",
        courses = classroomService.GetCourses(),
        logs
    });
});

app.MapPost("/api/quiz-attempt", async (
    QuizAttemptDto attempt,
    ClassroomDbContext db
) =>
{
    var quizAttempt = new QuizAttemptRecord
    {
        CourseId = attempt.CourseId,
        ActivityId = attempt.ActivityId,
        Score = attempt.Score,
        SubmittedAt = DateTime.Now
    };

    db.QuizAttempts.Add(quizAttempt);

    db.SyncLogs.Add(new SyncLogRecord
    {
        Time = DateTime.Now.ToString("HH:mm"),
        Object = "Quiz",
        Action = "Submit Attempt",
        Status = "Success",
        Message = $"Quiz attempt saved. Activity: {attempt.ActivityId}. Score: {attempt.Score}%."
    });

    await db.SaveChangesAsync();

    return Results.Ok(new
    {
        message = "Quiz attempt saved successfully",
        attempt = quizAttempt
    });
});

string[] googleClassroomScopes =
{
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.rosters.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.students",
    "https://www.googleapis.com/auth/classroom.announcements",

    // Create/manage Google Classroom courses
    "https://www.googleapis.com/auth/classroom.courses",

    // Invite/add teachers/students
    "https://www.googleapis.com/auth/classroom.rosters",

    "https://www.googleapis.com/auth/meetings.space.created",
    "https://www.googleapis.com/auth/meetings.space.readonly",

    "https://www.googleapis.com/auth/admin.reports.audit.readonly",

    // Google Calendar events / attendees
      CalendarService.Scope.CalendarEvents,
};

GoogleAuthorizationCodeFlow CreateGoogleFlow(IConfiguration configuration)
{
    var clientId = configuration["GoogleClassroom:ClientId"];
    var clientSecret = configuration["GoogleClassroom:ClientSecret"];

    if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
    {
        throw new InvalidOperationException("Google Classroom ClientId or ClientSecret is missing in appsettings.json.");
    }

    return new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
    {
        ClientSecrets = new ClientSecrets
        {
            ClientId = clientId,
            ClientSecret = clientSecret
        },
        Scopes = googleClassroomScopes,
   DataStore = new FileDataStore(
    configuration["GoogleClassroom:TokenDir"]
        ?? Environment.GetEnvironmentVariable("GOOGLE_TOKEN_DIR")
        ?? "GoogleClassroomTokens",
    true
)
    });
}

app.MapGet("/api/google/oauth/login", (IConfiguration configuration) =>
{
    var redirectUri = configuration["GoogleClassroom:RedirectUri"];

    if (string.IsNullOrWhiteSpace(redirectUri))
    {
        return Results.BadRequest(new
        {
            message = "GoogleClassroom RedirectUri is missing in appsettings.json."
        });
    }

    var flow = CreateGoogleFlow(configuration);
    var request = flow.CreateAuthorizationCodeRequest(redirectUri);

    var authorizationUrl = request.Build().ToString();
    authorizationUrl += "&prompt=consent";

    return Results.Redirect(authorizationUrl);
});

app.MapGet("/api/google/oauth/callback", async (
    string code,
    IConfiguration configuration
) =>
{
    var redirectUri = configuration["GoogleClassroom:RedirectUri"];

    if (string.IsNullOrWhiteSpace(redirectUri))
    {
        return Results.BadRequest(new
        {
            message = "GoogleClassroom RedirectUri is missing in appsettings.json."
        });
    }

    var flow = CreateGoogleFlow(configuration);

    TokenResponse token = await flow.ExchangeCodeForTokenAsync(
        userId: "local-user-coursework-meet-audit",
        code: code,
        redirectUri: redirectUri,
        taskCancellationToken: CancellationToken.None
    );

    if (token == null)
    {
        return Results.BadRequest(new
        {
            message = "Could not get Google OAuth token."
        });
    }

    var frontendRedirect =
    configuration["FrontendUrl"]
    ?? Environment.GetEnvironmentVariable("FRONTEND_URL")
    ?? "http://localhost:5173";

return Results.Redirect($"{frontendRedirect}?google=connected");
});

UserCredential? CreateGoogleCredential(IConfiguration configuration)
{
    var flow = CreateGoogleFlow(configuration);

    var userId = "local-user-coursework-meet-audit";

    var token = flow.LoadTokenAsync(
        userId: userId,
        taskCancellationToken: CancellationToken.None
    ).Result;

    if (token == null)
    {
        return null;
    }

    return new UserCredential(flow, userId, token);
}

app.MapGet("/api/google/classroom/courses", async (
    IConfiguration configuration
) =>
{
    var credential = CreateGoogleCredential(configuration);

    if (credential == null)
    {
        return Results.Unauthorized();
    }

    var classroomService = new ClassroomService(new BaseClientService.Initializer
    {
        HttpClientInitializer = credential,
        ApplicationName = "Classroom Web Demo"
    });

    var request = classroomService.Courses.List();
    request.PageSize = 20;

    var response = await request.ExecuteAsync();

    var googleCourses = response.Courses
        ?? new List<Google.Apis.Classroom.v1.Data.Course>();

    var courses = googleCourses.Select(course => new
    {
        id = course.Id,
        name = course.Name,
        section = course.Section,
        descriptionHeading = course.DescriptionHeading,
        courseState = course.CourseState,
        alternateLink = course.AlternateLink,
        ownerId = course.OwnerId
    }).ToList();

    return Results.Ok(courses);
});

app.MapGet("/api/google/classroom/mapped-courses", async (
    IConfiguration configuration
) =>
{
    var credential = CreateGoogleCredential(configuration);

    if (credential == null)
    {
        return Results.Unauthorized();
    }

    var classroomService = new ClassroomService(new BaseClientService.Initializer
    {
        HttpClientInitializer = credential,
        ApplicationName = "Classroom Web Demo"
    });

    var courseRequest = classroomService.Courses.List();
    courseRequest.PageSize = 20;

    var courseResponse = await courseRequest.ExecuteAsync();

    var googleCourses = courseResponse.Courses
        ?? new List<Google.Apis.Classroom.v1.Data.Course>();

    var mappedCourses = new List<CourseDto>();

    foreach (var googleCourse in googleCourses)
    {
        var activities = new List<ActivityDto>();

        try
        {
            var courseWorkRequest = classroomService.Courses.CourseWork.List(googleCourse.Id);
            courseWorkRequest.PageSize = 50;

            var courseWorkResponse = await courseWorkRequest.ExecuteAsync();

            var courseWorks = courseWorkResponse.CourseWork
                ?? new List<Google.Apis.Classroom.v1.Data.CourseWork>();

            activities = courseWorks.Select((work, index) => new ActivityDto
            {
                Id = work.Id ?? $"coursework-{index + 1}",
                Number = index + 1,
                Title = work.Title ?? "Untitled coursework",
                Type = "coursework",
                Status = work.State ?? "unknown",
                Duration = "N/A",
                Content = work.Description ?? "No description",
                Questions = new List<QuestionDto>()
            }).ToList();
        }
        catch (Exception ex)
        {
            activities.Add(new ActivityDto
            {
                Id = $"sync-error-{googleCourse.Id}",
                Number = 1,
                Title = "Could not load coursework",
                Type = "error",
                Status = "failed",
                Duration = "N/A",
                Content = ex.Message,
                Questions = new List<QuestionDto>()
            });
        }

        if (activities.Count == 0)
        {
            activities.Add(new ActivityDto
            {
                Id = $"empty-{googleCourse.Id}",
                Number = 1,
                Title = "No coursework yet",
                Type = "info",
                Status = "empty",
                Duration = "N/A",
                Content = "This Google Classroom course does not have coursework yet.",
                Questions = new List<QuestionDto>()
            });
        }

        mappedCourses.Add(new CourseDto
        {
            Id = googleCourse.Id ?? "",
            Title = googleCourse.Name ?? "Untitled Google Classroom Course",
            Code = googleCourse.Section ?? "GOOGLE-CLASSROOM",
            Status = googleCourse.CourseState ?? "UNKNOWN",
            Category = "Google Classroom",
            Students = 0,
            Progress = 0,
            LessonsCount = 1,
            LastSynced = DateTime.Now.ToString("HH:mm"),
            Description = googleCourse.DescriptionHeading
                ?? googleCourse.Description
                ?? "Imported from Google Classroom.",
            Lessons = new List<LessonDto>
            {
                new LessonDto
                {
                    Id = $"lesson-{googleCourse.Id}",
                    Title = "Google Classroom Coursework",
                    Locked = false,
                    Activities = activities
                }
            }
        });
    }

    return Results.Ok(mappedCourses);
});

app.MapPost("/api/google/meet/create-space", async (
    IConfiguration configuration
) =>
{
    var credential = CreateGoogleCredential(configuration);

    if (credential == null)
    {
        return Results.Unauthorized();
    }

    var accessToken = await credential.GetAccessTokenForRequestAsync();

    if (string.IsNullOrWhiteSpace(accessToken))
    {
        return Results.BadRequest(new
        {
            success = false,
            message = "Google access token is missing. Please login Google OAuth again."
        });
    }

    using var httpClient = new HttpClient();

    httpClient.DefaultRequestHeaders.Authorization =
        new AuthenticationHeaderValue("Bearer", accessToken);

    var requestBody = new StringContent(
        "{}",
        Encoding.UTF8,
        "application/json"
    );

    var response = await httpClient.PostAsync(
        "https://meet.googleapis.com/v2/spaces",
        requestBody
    );

    var responseText = await response.Content.ReadAsStringAsync();

    if (!response.IsSuccessStatusCode)
    {
        return Results.Json(
            new
            {
                success = false,
                statusCode = (int)response.StatusCode,
                message = "Could not create Google Meet space.",
                details = responseText
            },
            statusCode: (int)response.StatusCode
        );
    }

    using var jsonDoc = JsonDocument.Parse(responseText);
    var root = jsonDoc.RootElement;

    string? name = root.TryGetProperty("name", out var nameValue)
        ? nameValue.GetString()
        : null;

    string? meetingUri = root.TryGetProperty("meetingUri", out var uriValue)
        ? uriValue.GetString()
        : null;

    string? meetingCode = root.TryGetProperty("meetingCode", out var codeValue)
        ? codeValue.GetString()
        : null;

    return Results.Ok(new
    {
        success = true,
        message = "Google Meet space created successfully",
        data = new
        {
            name,
            meetingUri,
            meetingCode
        }
    });
});

app.MapPost("/api/google/classroom/create-meet-announcement", async (
    JsonElement body,
    IConfiguration configuration
) =>
{
    string? courseId = body.TryGetProperty("courseId", out var courseIdValue)
        ? courseIdValue.GetString()
        : null;

    string title = body.TryGetProperty("title", out var titleValue)
        ? titleValue.GetString() ?? "Algo Live Class"
        : "Algo Live Class";

    string text = body.TryGetProperty("text", out var textValue)
        ? textValue.GetString() ?? "Please join the live class using the Google Meet link below."
        : "Please join the live class using the Google Meet link below.";

    if (string.IsNullOrWhiteSpace(courseId))
    {
        return Results.BadRequest(new
        {
            success = false,
            message = "courseId is required."
        });
    }

    var credential = CreateGoogleCredential(configuration);

    if (credential == null)
    {
        return Results.Unauthorized();
    }

    var accessToken = await credential.GetAccessTokenForRequestAsync();

    if (string.IsNullOrWhiteSpace(accessToken))
    {
        return Results.BadRequest(new
        {
            success = false,
            message = "Google access token is missing. Please login Google OAuth again."
        });
    }

    using var httpClient = new HttpClient();

    httpClient.DefaultRequestHeaders.Authorization =
        new AuthenticationHeaderValue("Bearer", accessToken);

    var meetRequestBody = new StringContent(
        "{}",
        Encoding.UTF8,
        "application/json"
    );

    var meetResponse = await httpClient.PostAsync(
        "https://meet.googleapis.com/v2/spaces",
        meetRequestBody
    );

    var meetResponseText = await meetResponse.Content.ReadAsStringAsync();

    if (!meetResponse.IsSuccessStatusCode)
    {
        return Results.Json(
            new
            {
                success = false,
                stage = "create_google_meet",
                statusCode = (int)meetResponse.StatusCode,
                message = "Could not create Google Meet space.",
                details = meetResponseText
            },
            statusCode: (int)meetResponse.StatusCode
        );
    }

    using var meetJsonDoc = JsonDocument.Parse(meetResponseText);
    var meetRoot = meetJsonDoc.RootElement;

    string? meetingUri = meetRoot.TryGetProperty("meetingUri", out var uriValue)
        ? uriValue.GetString()
        : null;

    string? meetingCode = meetRoot.TryGetProperty("meetingCode", out var codeValue)
        ? codeValue.GetString()
        : null;

    string? meetSpaceName = meetRoot.TryGetProperty("name", out var nameValue)
        ? nameValue.GetString()
        : null;

    if (string.IsNullOrWhiteSpace(meetingUri))
    {
        return Results.BadRequest(new
        {
            success = false,
            message = "Google Meet was created but meetingUri was missing.",
            raw = meetResponseText
        });
    }

    var classroomService = new ClassroomService(new BaseClientService.Initializer
    {
        HttpClientInitializer = credential,
        ApplicationName = "Classroom Web Demo"
    });

    var announcement = new Google.Apis.Classroom.v1.Data.Announcement
    {
        Text = $"{title}\n\n{text}\n\nJoin Google Meet: {meetingUri}",
        State = "PUBLISHED",
        Materials = new List<Google.Apis.Classroom.v1.Data.Material>
        {
            new Google.Apis.Classroom.v1.Data.Material
            {
                Link = new Google.Apis.Classroom.v1.Data.Link
                {
                    Url = meetingUri,
                    Title = "Join Google Meet"
                }
            }
        }
    };

    var createAnnouncementRequest =
        classroomService.Courses.Announcements.Create(announcement, courseId);

    var createdAnnouncement = await createAnnouncementRequest.ExecuteAsync();

    return Results.Ok(new
    {
        success = true,
        message = "Google Meet created and posted to Google Classroom successfully.",
        data = new
        {
            courseId,
            meet = new
            {
                name = meetSpaceName,
                meetingUri,
                meetingCode
            },
            announcement = new
            {
                id = createdAnnouncement.Id,
                alternateLink = createdAnnouncement.AlternateLink,
                state = createdAnnouncement.State,
                text = createdAnnouncement.Text
            }
        }
    });
});
app.MapPost("/api/google/classroom/create-demo-class", async (
    CreateClassroomDemoRequest requestBody,
    IConfiguration configuration,
    CancellationToken cancellationToken
) =>
{
    try
    {
        var credential = CreateGoogleCredential(configuration);

        if (credential == null)
        {
            return Results.Json(
                new
                {
                    success = false,
                    message = "Google OAuth token not found. Please login first at /api/google/oauth/login."
                },
                statusCode: 401
            );
        }

        if (credential.Token.IsExpired(Google.Apis.Util.SystemClock.Default))
        {
            var refreshed = await credential.RefreshTokenAsync(cancellationToken);

            if (!refreshed)
            {
                return Results.Json(
                    new
                    {
                        success = false,
                        message = "Google OAuth token expired and refresh failed. Please login again at /api/google/oauth/login."
                    },
                    statusCode: 401
                );
            }
        }

        var classroomService = new ClassroomService(
            new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "Algo Live Class Portal"
            }
        );

        var course = new Google.Apis.Classroom.v1.Data.Course
        {
            Name = string.IsNullOrWhiteSpace(requestBody.Name)
                ? "Demo Google Classroom Meet"
                : requestBody.Name,

            Section = string.IsNullOrWhiteSpace(requestBody.Section)
                ? "Test Co-host"
                : requestBody.Section,

            Subject = string.IsNullOrWhiteSpace(requestBody.Subject)
                ? "Google Meet Demo"
                : requestBody.Subject,

            Room = string.IsNullOrWhiteSpace(requestBody.Room)
                ? "Online"
                : requestBody.Room,

            OwnerId = string.IsNullOrWhiteSpace(requestBody.OwnerId)
                ? "me"
                : requestBody.OwnerId,

            CourseState = "ACTIVE"
        };

        var createdCourse = await classroomService.Courses
            .Create(course)
            .ExecuteAsync(cancellationToken);

        var coTeacherResults = new List<object>();

        foreach (var rawEmail in requestBody.CoTeacherEmails ?? new List<string>())
        {
            var email = (rawEmail ?? "").Trim();

            if (string.IsNullOrWhiteSpace(email))
            {
                continue;
            }

            try
            {
                var invitation = new Google.Apis.Classroom.v1.Data.Invitation
                {
                    CourseId = createdCourse.Id,
                    UserId = email,
                    Role = "TEACHER"
                };

                var createdInvitation = await classroomService.Invitations
                    .Create(invitation)
                    .ExecuteAsync(cancellationToken);

                coTeacherResults.Add(new
                {
                    email,
                    success = true,
                    invitationId = createdInvitation.Id,
                    role = createdInvitation.Role,
                    message = "Teacher invitation sent. Teacher must accept the invite in Google Classroom."
                });
            }
            catch (Google.GoogleApiException ex)
            {
                coTeacherResults.Add(new
                {
                    email,
                    success = false,
                    statusCode = (int)ex.HttpStatusCode,
                    error = ex.Error?.Message ?? ex.Message
                });
            }
        }

        return Results.Json(new
        {
            success = true,
            message = "Classroom class created. Co-teacher invitations processed.",
            course = new
            {
                id = createdCourse.Id,
                name = createdCourse.Name,
                section = createdCourse.Section,
                subject = createdCourse.Subject,
                room = createdCourse.Room,
                ownerId = createdCourse.OwnerId,
                courseState = createdCourse.CourseState,
                alternateLink = createdCourse.AlternateLink
            },
            coTeachers = coTeacherResults,
            nextStep = "Open the Classroom link, ask teachers to accept the invitation, then generate the Meet link in Classroom Settings."
        });
    }
    catch (Google.GoogleApiException ex)
    {
        return Results.Json(
            new
            {
                success = false,
                message = "Google Classroom API error.",
                statusCode = (int)ex.HttpStatusCode,
                error = ex.Error?.Message ?? ex.Message,
                details = ex.ToString()
            },
            statusCode: (int)ex.HttpStatusCode
        );
    }
    catch (Exception ex)
    {
        return Results.Json(
            new
            {
                success = false,
                message = "Unexpected server error while creating Classroom class.",
                error = ex.Message,
                details = ex.ToString()
            },
            statusCode: 500
        );
    }
});
// ===============================
// LIVE CLASS TRACKING
// ===============================

var liveTrackingFolder = Path.Combine(appDataDir, "Data");
var liveTrackingFile = Path.Combine(liveTrackingFolder, "live-tracking-events.json");

Directory.CreateDirectory(liveTrackingFolder);

List<LiveTrackingEventRecord> LoadLiveTrackingEvents()
{
    if (!File.Exists(liveTrackingFile))
    {
        File.WriteAllText(liveTrackingFile, "[]");
    }

    var raw = File.ReadAllText(liveTrackingFile);

    return JsonSerializer.Deserialize<List<LiveTrackingEventRecord>>(raw)
        ?? new List<LiveTrackingEventRecord>();
}

void SaveLiveTrackingEvents(List<LiveTrackingEventRecord> events)
{
    var raw = JsonSerializer.Serialize(events, new JsonSerializerOptions
    {
        WriteIndented = true
    });

    File.WriteAllText(liveTrackingFile, raw);
}

LiveTrackingEventRecord CreateTrackingEvent(
    string eventType,
    LiveClassTrackingRequest request,
    Dictionary<string, string>? metadata = null
)
{
    return new LiveTrackingEventRecord
    {
        Id = Guid.NewGuid().ToString(),
        EventType = eventType,
        UserId = string.IsNullOrWhiteSpace(request.UserId)
            ? "student-demo-001"
            : request.UserId,
        UserName = string.IsNullOrWhiteSpace(request.UserName)
            ? "Student Demo"
            : request.UserName,
        Email = string.IsNullOrWhiteSpace(request.Email)
            ? "student.demo@test.com"
            : request.Email,
        GroupCode = string.IsNullOrWhiteSpace(request.GroupCode)
            ? "API Demo Test Class"
            : request.GroupCode,
        LessonId = request.LessonId ?? "",
        MeetLink = request.MeetLink ?? "",
        ReceivedAt = DateTime.Now,
        ClientTimestamp = request.ClientTimestamp ?? "",
        Metadata = metadata ?? new Dictionary<string, string>()
    };
}

void SaveTrackingEvent(LiveTrackingEventRecord newEvent)
{
    var events = LoadLiveTrackingEvents();

    events.Insert(0, newEvent);
    events = events.Take(10000).ToList();

    SaveLiveTrackingEvents(events);
}

app.MapPost("/api/live-class/login", (LiveClassTrackingRequest request) =>
{
    var newEvent = CreateTrackingEvent("user_login", request);
    SaveTrackingEvent(newEvent);

    return Results.Ok(new
    {
        success = true,
        message = "Login tracked.",
        data = newEvent
    });
});

app.MapPost("/api/live-class/logout", (LiveClassTrackingRequest request) =>
{
    var newEvent = CreateTrackingEvent("user_logout", request);
    SaveTrackingEvent(newEvent);

    return Results.Ok(new
    {
        success = true,
        message = "Logout tracked.",
        data = newEvent
    });
});

app.MapPost("/api/live-class/device-check", (LiveClassTrackingRequest request) =>
{
    var cameraReady = request.CameraReady ?? false;
    var microphoneReady = request.MicrophoneReady ?? false;

    var eventType =
        cameraReady && microphoneReady
            ? "camera_microphone_check_success"
            : "camera_microphone_check_failed";

    var newEvent = CreateTrackingEvent(
        eventType,
        request,
        new Dictionary<string, string>
        {
            ["cameraReady"] = cameraReady ? "true" : "false",
            ["microphoneReady"] = microphoneReady ? "true" : "false"
        }
    );

    SaveTrackingEvent(newEvent);

    return Results.Ok(new
    {
        success = true,
        message = "Device check tracked.",
        data = newEvent
    });
});

app.MapPost("/api/live-class/screen-check", (LiveClassTrackingRequest request) =>
{
    var screenReady = request.ScreenReady ?? false;

    var eventType =
        screenReady
            ? "screen_share_check_success"
            : "screen_share_check_failed";

    var newEvent = CreateTrackingEvent(
        eventType,
        request,
        new Dictionary<string, string>
        {
            ["screenReady"] = screenReady ? "true" : "false"
        }
    );

    SaveTrackingEvent(newEvent);

    return Results.Ok(new
    {
        success = true,
        message = "Screen share check tracked.",
        data = newEvent
    });
});

app.MapPost("/api/live-class/join-meet", (LiveClassTrackingRequest request) =>
{
    var newEvent = CreateTrackingEvent("join_meet_clicked", request);
    SaveTrackingEvent(newEvent);

    return Results.Ok(new
    {
        success = true,
        message = "Join Meet tracked.",
        data = newEvent
    });
});

app.MapGet("/api/live-class/events", () =>
{
    var events = LoadLiveTrackingEvents();

    return Results.Ok(new
    {
        success = true,
        total = events.Count,
        data = events
    });
});

app.MapGet("/api/live-class/monitor", () =>
{
    var events = LoadLiveTrackingEvents()
        .OrderByDescending(e => e.ReceivedAt)
        .ToList();

    var students = events
        .Where(e => !string.IsNullOrWhiteSpace(e.UserId))
        .GroupBy(e => e.UserId)
        .Select(group =>
        {
            var studentEvents = group
                .OrderByDescending(e => e.ReceivedAt)
                .ToList();

            var latestEvent = studentEvents.FirstOrDefault();

            var latestLogin = studentEvents
                .FirstOrDefault(e => e.EventType == "user_login");

            var latestLogout = studentEvents
                .FirstOrDefault(e => e.EventType == "user_logout");

            var latestCameraMicSuccess = studentEvents
                .FirstOrDefault(e => e.EventType == "camera_microphone_check_success");

            var latestCameraMicFailed = studentEvents
                .FirstOrDefault(e => e.EventType == "camera_microphone_check_failed");

            var latestScreenSuccess = studentEvents
                .FirstOrDefault(e => e.EventType == "screen_share_check_success");

            var latestScreenFailed = studentEvents
                .FirstOrDefault(e => e.EventType == "screen_share_check_failed");

            var latestJoinMeet = studentEvents
                .FirstOrDefault(e => e.EventType == "join_meet_clicked");

            var isOnline =
                latestLogin != null &&
                (latestLogout == null || latestLogin.ReceivedAt > latestLogout.ReceivedAt);

            var cameraReady =
                latestCameraMicSuccess != null &&
                (latestCameraMicFailed == null ||
                 latestCameraMicSuccess.ReceivedAt > latestCameraMicFailed.ReceivedAt);

            var microphoneReady = cameraReady;

            var screenReady =
                latestScreenSuccess != null &&
                (latestScreenFailed == null ||
                 latestScreenSuccess.ReceivedAt > latestScreenFailed.ReceivedAt);

            var joinedMeet = latestJoinMeet != null;

            return new
            {
                userId = group.Key,
                userName = latestEvent?.UserName ?? "Unknown User",
                email = latestEvent?.Email ?? "",
                groupCode = latestEvent?.GroupCode ?? "",
                isOnline,
                cameraReady,
                microphoneReady,
                screenReady,
                joinedMeet,
                lastLoginAt = latestLogin?.ReceivedAt,
                lastLogoutAt = latestLogout?.ReceivedAt,
                lastDeviceCheckAt =
                    latestCameraMicSuccess?.ReceivedAt ??
                    latestCameraMicFailed?.ReceivedAt,
                lastScreenCheckAt =
                    latestScreenSuccess?.ReceivedAt ??
                    latestScreenFailed?.ReceivedAt,
                lastJoinMeetAt = latestJoinMeet?.ReceivedAt,
                lastSeenAt = latestEvent?.ReceivedAt,
                totalEvents = studentEvents.Count
            };
        })
        .OrderBy(s => s.userName)
        .ToList();

    var timeline = events
        .Take(100)
        .Select(e => new
        {
            userId = e.UserId,
            userName = e.UserName,
            email = e.Email,
            groupCode = e.GroupCode,
            action = e.EventType,
            message = e.EventType switch
            {
                "user_login" => $"{e.UserName} logged in.",
                "user_logout" => $"{e.UserName} logged out.",
                "camera_microphone_check_success" => $"{e.UserName} camera/microphone check OK.",
                "camera_microphone_check_failed" => $"{e.UserName} camera/microphone check failed.",
                "screen_share_check_success" => $"{e.UserName} screen share check OK.",
                "screen_share_check_failed" => $"{e.UserName} screen share check failed.",
                "join_meet_clicked" => $"{e.UserName} clicked Join Google Meet.",
                _ => $"{e.UserName} activity: {e.EventType}"
            },
            time = e.ReceivedAt
        })
        .ToList();

    var summary = new
    {
        totalStudents = students.Count,
        online = students.Count(s => s.isOnline),
        cameraReady = students.Count(s => s.cameraReady),
        microphoneReady = students.Count(s => s.microphoneReady),
        screenReady = students.Count(s => s.screenReady),
        joinedMeet = students.Count(s => s.joinedMeet)
    };

    return Results.Ok(new
    {
        success = true,
        summary,
        students,
        timeline
    });
});

app.MapPost("/api/live-class/clear", () =>
{
    SaveLiveTrackingEvents(new List<LiveTrackingEventRecord>());

    return Results.Ok(new
    {
        success = true,
        message = "Live class tracking cleared."
    });
});
app.MapGet("/api/google/meet-audit-logs", async (
    IConfiguration configuration,
    CancellationToken cancellationToken
) =>
{
    try
    {
        var credential = CreateGoogleCredential(configuration);

        if (credential == null)
        {
            return Results.Json(
                new
                {
                    success = false,
                    message = "Google OAuth token not found. Please connect Google first."
                },
                statusCode: 401
            );
        }

        if (credential.Token.IsExpired(Google.Apis.Util.SystemClock.Default))
        {
            var refreshed = await credential.RefreshTokenAsync(cancellationToken);

            if (!refreshed)
            {
                return Results.Json(
                    new
                    {
                        success = false,
                        message = "Google OAuth token expired and refresh failed. Please connect Google again."
                    },
                    statusCode: 401
                );
            }
        }

        var reportsService = new Google.Apis.Admin.Reports.reports_v1.ReportsService(
            new Google.Apis.Services.BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "Algo Live Class Portal"
            }
        );

        var request = reportsService.Activities.List(
            "all",
            Google.Apis.Admin.Reports.reports_v1.ActivitiesResource.ListRequest.ApplicationNameEnum.Meet
        );

        request.MaxResults = 50;
        request.StartTime = DateTime.UtcNow
            .AddDays(-7)
            .ToString("yyyy-MM-dd'T'HH:mm:ss'Z'");

        var result = await request.ExecuteAsync(cancellationToken);

        var items = (result.Items ?? new List<Google.Apis.Admin.Reports.reports_v1.Data.Activity>())
            .Select(item => new
            {
                id = item.Id?.UniqueQualifier,
                time = item.Id?.Time,
                applicationName = item.Id?.ApplicationName,
                customerId = item.Id?.CustomerId,
                actorEmail = item.Actor?.Email,
                ipAddress = item.IpAddress,
                events = item.Events?.Select(e => new
                {
                    name = e.Name,
                    type = e.Type,
                    parameters = e.Parameters?.Select(p => new
                    {
                        name = p.Name,
                        value = p.Value,
                        intValue = p.IntValue,
                        boolValue = p.BoolValue,
                        multiValue = p.MultiValue
                    }).ToList()
                }).ToList()
            })
            .ToList();

        return Results.Ok(new
        {
            success = true,
            total = items.Count,
            data = items
        });
    }
    catch (Google.GoogleApiException ex)
    {
        return Results.Json(
            new
            {
                success = false,
                message = "Google API error while reading Meet audit logs.",
                statusCode = ex.HttpStatusCode,
                error = ex.Error?.Message,
                details = ex.ToString()
            },
            statusCode: (int)ex.HttpStatusCode
        );
    }
    catch (Exception ex)
    {
        return Results.Json(
            new
            {
                success = false,
                message = "Backend error while reading Meet audit logs.",
                error = ex.Message,
                details = ex.ToString()
            },
            statusCode: 500
        );
    }
});

string NormalizeForMatch(string? value)
{
    if (string.IsNullOrWhiteSpace(value))
    {
        return "";
    }

    var formD = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
    var builder = new StringBuilder();

    foreach (var ch in formD)
    {
        var category = CharUnicodeInfo.GetUnicodeCategory(ch);

        if (category != UnicodeCategory.NonSpacingMark && char.IsLetterOrDigit(ch))
        {
            builder.Append(ch);
        }
    }

    return builder.ToString().Normalize(NormalizationForm.FormC);
}

bool IsMaskedOrMissingEmail(string? email)
{
    return string.IsNullOrWhiteSpace(email) || email.Contains("*");
}

string ResolveEmailFromCalendarRoster(
    string? meetIdentifier,
    string? meetDisplayName,
    List<(string Email, string DisplayName)> calendarAttendees
)
{
    var rawIdentifier = (meetIdentifier ?? "").Trim();

    if (!IsMaskedOrMissingEmail(rawIdentifier))
    {
        return rawIdentifier;
    }

    if (calendarAttendees.Count == 0)
    {
        return "Unknown external participant";
    }

    var normalizedIdentifier = rawIdentifier.ToLowerInvariant();

    if (normalizedIdentifier.Contains("@"))
    {
        var parts = normalizedIdentifier.Split('@', 2);
        var maskedLocal = parts[0];
        var maskedDomain = parts.Length > 1 ? parts[1] : "";
        var localPrefix = maskedLocal.Split('*')[0];

        var domainSuffix = "";
        var lastStarIndex = maskedDomain.LastIndexOf('*');

        if (lastStarIndex >= 0 && lastStarIndex + 1 < maskedDomain.Length)
        {
            domainSuffix = maskedDomain[(lastStarIndex + 1)..];
        }
        else if (!maskedDomain.Contains("*"))
        {
            domainSuffix = maskedDomain;
        }

        var maskedMatches = calendarAttendees
            .Where(attendee => !string.IsNullOrWhiteSpace(attendee.Email))
            .Where(attendee =>
            {
                var email = attendee.Email.Trim().ToLowerInvariant();
                var local = email.Split('@')[0];

                var prefixOk = string.IsNullOrWhiteSpace(localPrefix) || local.StartsWith(localPrefix);
                var domainOk = string.IsNullOrWhiteSpace(domainSuffix) || email.EndsWith(domainSuffix);

                return prefixOk && domainOk;
            })
            .Select(attendee => attendee.Email)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (maskedMatches.Count == 1)
        {
            return maskedMatches[0];
        }
    }

    var displayNameForMatch = (meetDisplayName ?? "").Split('(')[0].Trim();
    var nameTokens = displayNameForMatch
        .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Select(NormalizeForMatch)
        .Where(token => token.Length >= 2)
        .Distinct()
        .ToList();

    if (nameTokens.Count > 0)
    {
        var nameMatches = calendarAttendees
            .Where(attendee => !string.IsNullOrWhiteSpace(attendee.Email))
            .Where(attendee =>
            {
                var emailLocal = NormalizeForMatch(attendee.Email.Split('@')[0]);
                var attendeeDisplay = NormalizeForMatch(attendee.DisplayName);
                var joinedTokens = string.Join("", nameTokens);
                var reversedTokens = string.Join("", nameTokens.AsEnumerable().Reverse());

                var emailMatch =
                    nameTokens.All(token => emailLocal.Contains(token)) ||
                    emailLocal.Contains(joinedTokens) ||
                    emailLocal.Contains(reversedTokens);

                var displayNameMatch =
                    !string.IsNullOrWhiteSpace(attendeeDisplay) &&
                    nameTokens.All(token => attendeeDisplay.Contains(token));

                return emailMatch || displayNameMatch;
            })
            .Select(attendee => attendee.Email)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (nameMatches.Count == 1)
        {
            return nameMatches[0];
        }
    }

    return "Unknown external participant";
}

app.MapGet("/api/google/meet-audit-summary", async (
    IConfiguration configuration,
    CancellationToken cancellationToken,
    string? meetingCode
) =>
{
    try
    {
        var credential = CreateGoogleCredential(configuration);

        if (credential == null)
        {
            return Results.Json(
                new
                {
                    success = false,
                    message = "Google OAuth token not found. Please connect Google first."
                },
                statusCode: 401
            );
        }

        if (credential.Token.IsExpired(Google.Apis.Util.SystemClock.Default))
        {
            var refreshed = await credential.RefreshTokenAsync(cancellationToken);

            if (!refreshed)
            {
                return Results.Json(
                    new
                    {
                        success = false,
                        message = "Google OAuth token expired and refresh failed. Please connect Google again."
                    },
                    statusCode: 401
                );
            }
        }

        var targetMeetingCode = NormalizeMeetingCode(meetingCode);

        var calendarAttendeesByMeetingCode = new Dictionary<string, List<(string Email, string DisplayName)>>(StringComparer.OrdinalIgnoreCase);
        var calendarSummaryByMeetingCode = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        var calendarService = new CalendarService(
            new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "Algo Live Class Portal"
            }
        );

        var calendarRequest = calendarService.Events.List("primary");
        calendarRequest.SingleEvents = true;
        calendarRequest.ShowDeleted = false;
        calendarRequest.OrderBy = EventsResource.ListRequest.OrderByEnum.StartTime;
        calendarRequest.MaxResults = 250;
        calendarRequest.TimeMinDateTimeOffset = DateTimeOffset.UtcNow.AddDays(-7);
        calendarRequest.TimeMaxDateTimeOffset = DateTimeOffset.UtcNow.AddDays(14);

        var calendarResponse = await calendarRequest.ExecuteAsync(cancellationToken);

        foreach (var calendarEvent in calendarResponse.Items ?? new List<Event>())
        {
            var eventMeetingCode = ExtractMeetingCodeFromEvent(calendarEvent);

            if (string.IsNullOrWhiteSpace(eventMeetingCode))
            {
                continue;
            }

            if (!calendarAttendeesByMeetingCode.ContainsKey(eventMeetingCode))
            {
                calendarAttendeesByMeetingCode[eventMeetingCode] = new List<(string Email, string DisplayName)>();
            }

            if (!calendarSummaryByMeetingCode.ContainsKey(eventMeetingCode))
            {
                calendarSummaryByMeetingCode[eventMeetingCode] = calendarEvent.Summary ?? "";
            }

            foreach (var attendee in calendarEvent.Attendees ?? new List<EventAttendee>())
            {
                if (string.IsNullOrWhiteSpace(attendee.Email))
                {
                    continue;
                }

                calendarAttendeesByMeetingCode[eventMeetingCode].Add((
                    attendee.Email,
                    attendee.DisplayName ?? ""
                ));
            }
        }

        foreach (var key in calendarAttendeesByMeetingCode.Keys.ToList())
        {
            calendarAttendeesByMeetingCode[key] = calendarAttendeesByMeetingCode[key]
                .GroupBy(attendee => attendee.Email, StringComparer.OrdinalIgnoreCase)
                .Select(group => group.First())
                .ToList();
        }

        var reportsService = new Google.Apis.Admin.Reports.reports_v1.ReportsService(
            new Google.Apis.Services.BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "Algo Live Class Portal"
            }
        );

        var request = reportsService.Activities.List(
            "all",
            Google.Apis.Admin.Reports.reports_v1.ActivitiesResource.ListRequest.ApplicationNameEnum.Meet
        );

        request.MaxResults = 100;
        request.StartTime = DateTime.UtcNow
            .AddDays(-7)
            .ToString("yyyy-MM-dd'T'HH:mm:ss'Z'");

        var result = await request.ExecuteAsync(cancellationToken);

        var rows = new List<object>();

        if (result.Items != null)
        {
            foreach (var item in result.Items)
            {
                if (item.Events == null)
                {
                    continue;
                }

                foreach (var meetEvent in item.Events)
                {
                    if (meetEvent.Name != "call_ended")
                    {
                        continue;
                    }

                    if (meetEvent.Parameters == null)
                    {
                        continue;
                    }

                    string GetValue(string name)
                    {
                        return meetEvent.Parameters
                            .FirstOrDefault(p => p.Name == name)
                            ?.Value ?? "";
                    }

                    long GetLong(string name)
                    {
                        return meetEvent.Parameters
                            .FirstOrDefault(p => p.Name == name)
                            ?.IntValue ?? 0;
                    }

                    bool GetBool(string name)
                    {
                        return meetEvent.Parameters
                            .FirstOrDefault(p => p.Name == name)
                            ?.BoolValue ?? false;
                    }

                    var code = NormalizeMeetingCode(GetValue("meeting_code"));

                    if (!string.IsNullOrWhiteSpace(targetMeetingCode) &&
                        !string.Equals(code, targetMeetingCode, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    var rawIdentifier = GetValue("identifier");
                    var displayName = GetValue("display_name");

                    calendarAttendeesByMeetingCode.TryGetValue(code, out var calendarRoster);
                    calendarRoster ??= new List<(string Email, string DisplayName)>();

                    var resolvedEmail = ResolveEmailFromCalendarRoster(
                        rawIdentifier,
                        displayName,
                        calendarRoster
                    );

                    calendarSummaryByMeetingCode.TryGetValue(code, out var calendarSummary);

                    var startTimestampSeconds = GetLong("start_timestamp_seconds");
                    var durationSeconds = GetLong("duration_seconds");

                    DateTimeOffset? joinedAt = null;
                    DateTimeOffset? leftAt = null;

                    if (startTimestampSeconds > 0)
                    {
                        joinedAt = DateTimeOffset
                            .FromUnixTimeSeconds(startTimestampSeconds)
                            .ToLocalTime();

                        leftAt = joinedAt.Value.AddSeconds(durationSeconds);
                    }

                    var audioSendSeconds = GetLong("audio_send_seconds");
                    var videoSendSeconds = GetLong("video_send_seconds");
                    var screenSendSeconds = GetLong("screencast_send_seconds");

                    rows.Add(new
                    {
                        meetingCode = code,
                        conferenceId = GetValue("conference_id"),
                        organizerEmail = GetValue("organizer_email"),

                        calendarSummary = calendarSummary ?? "",
                        calendarRosterEmails = calendarRoster.Select(attendee => attendee.Email).ToList(),
                        calendarRosterCount = calendarRoster.Count,

                        studentName = displayName,
                        studentEmail = resolvedEmail,
                        meetIdentifier = rawIdentifier,
                        identifierType = GetValue("identifier_type"),
                        isExternal = GetBool("is_external"),

                        emailSource = IsMaskedOrMissingEmail(rawIdentifier)
                            ? (resolvedEmail == "Unknown external participant" ? "unknown" : "calendar")
                            : "meet_audit",

                        joinedAt = joinedAt?.ToString("yyyy-MM-dd HH:mm:ss"),
                        leftAt = leftAt?.ToString("yyyy-MM-dd HH:mm:ss"),
                        durationMinutes = Math.Round(durationSeconds / 60.0, 1),

                        micUsed = audioSendSeconds > 0,
                        cameraUsed = videoSendSeconds > 0,
                        screenShared = screenSendSeconds > 0,

                        audioSendSeconds,
                        videoSendSeconds,
                        screenSendSeconds,

                        deviceType = GetValue("device_type"),
                        ipAddress = GetValue("ip_address"),
                        networkRttMs = GetLong("network_rtt_msec_mean")
                    });
                }
            }
        }

        return Results.Ok(new
        {
            success = true,
            total = rows.Count,
            data = rows
        });
    }
    catch (Google.GoogleApiException ex)
    {
        return Results.Json(
            new
            {
                success = false,
                message = "Google API error while reading Meet audit summary.",
                statusCode = ex.HttpStatusCode,
                error = ex.Error?.Message,
                details = ex.ToString()
            },
            statusCode: (int)ex.HttpStatusCode
        );
    }
    catch (Exception ex)
    {
        return Results.Json(
            new
            {
                success = false,
                message = "Backend error while reading Meet audit summary.",
                error = ex.Message,
                details = ex.ToString()
            },
            statusCode: 500
        );
    }
});

string NormalizeMeetingCode(string? value)
{
    if (string.IsNullOrWhiteSpace(value))
    {
        return "";
    }

    var raw = value.Trim();

    if (raw.Contains("meet.google.com", StringComparison.OrdinalIgnoreCase))
    {
        raw = raw.Split('?')[0].TrimEnd('/').Split('/').LastOrDefault() ?? raw;
    }

    var cleaned = new string(raw
        .Where(char.IsLetterOrDigit)
        .ToArray());

    return cleaned.ToUpperInvariant();
}

string ExtractMeetingCodeFromEvent(Event calendarEvent)
{
    var hangoutLinkCode = NormalizeMeetingCode(calendarEvent.HangoutLink);

    if (!string.IsNullOrWhiteSpace(hangoutLinkCode))
    {
        return hangoutLinkCode;
    }

    var videoEntryPoint = calendarEvent.ConferenceData?.EntryPoints?
        .FirstOrDefault(entryPoint =>
            string.Equals(entryPoint.EntryPointType, "video", StringComparison.OrdinalIgnoreCase)
        );

    return NormalizeMeetingCode(videoEntryPoint?.Uri);
}

app.MapGet("/api/google/calendar/events", async (
    IConfiguration configuration,
    CancellationToken cancellationToken,
    string? meetingCode
) =>
{
    try
    {
        var credential = CreateGoogleCredential(configuration);

        if (credential == null)
        {
            return Results.Json(
                new
                {
                    success = false,
                    message = "Google OAuth token not found. Please connect Google first at /api/google/oauth/login."
                },
                statusCode: 401
            );
        }

        if (credential.Token.IsExpired(Google.Apis.Util.SystemClock.Default))
        {
            var refreshed = await credential.RefreshTokenAsync(cancellationToken);

            if (!refreshed)
            {
                return Results.Json(
                    new
                    {
                        success = false,
                        message = "Google OAuth token expired and refresh failed. Please connect Google again."
                    },
                    statusCode: 401
                );
            }
        }

        var calendarService = new CalendarService(
            new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "Algo Live Class Portal"
            }
        );

        var request = calendarService.Events.List("primary");
        request.SingleEvents = true;
        request.ShowDeleted = false;
        request.OrderBy = EventsResource.ListRequest.OrderByEnum.StartTime;
        request.MaxResults = 100;
        request.TimeMinDateTimeOffset = DateTimeOffset.UtcNow.AddDays(-7);
        request.TimeMaxDateTimeOffset = DateTimeOffset.UtcNow.AddDays(14);

        var response = await request.ExecuteAsync(cancellationToken);
        var targetMeetingCode = NormalizeMeetingCode(meetingCode);

        var events = (response.Items ?? new List<Event>())
            .Select(calendarEvent =>
            {
                var eventMeetingCode = ExtractMeetingCodeFromEvent(calendarEvent);

                var attendees = (calendarEvent.Attendees ?? new List<EventAttendee>())
                    .Where(attendee => !string.IsNullOrWhiteSpace(attendee.Email))
                    .Select(attendee => new
                    {
                        email = attendee.Email,
                        displayName = attendee.DisplayName,
                        responseStatus = attendee.ResponseStatus
                    })
                    .ToList();

                return new
                {
                    eventId = calendarEvent.Id,
                    summary = calendarEvent.Summary,
                    description = calendarEvent.Description,
                    htmlLink = calendarEvent.HtmlLink,
                    start = calendarEvent.Start?.DateTimeRaw ?? calendarEvent.Start?.Date,
                    end = calendarEvent.End?.DateTimeRaw ?? calendarEvent.End?.Date,
                    meetLink = calendarEvent.HangoutLink
                        ?? calendarEvent.ConferenceData?.EntryPoints?
                            .FirstOrDefault(entryPoint =>
                                string.Equals(entryPoint.EntryPointType, "video", StringComparison.OrdinalIgnoreCase)
                            )?.Uri,
                    meetingCode = eventMeetingCode,
                    attendees
                };
            })
            .Where(item =>
                string.IsNullOrWhiteSpace(targetMeetingCode) ||
                string.Equals(item.meetingCode, targetMeetingCode, StringComparison.OrdinalIgnoreCase)
            )
            .ToList();

        return Results.Ok(new
        {
            success = true,
            total = events.Count,
            data = events
        });
    }
    catch (Google.GoogleApiException ex)
    {
        return Results.Json(
            new
            {
                success = false,
                message = "Google API error while reading Calendar events.",
                statusCode = ex.HttpStatusCode,
                error = ex.Error?.Message,
                details = ex.ToString()
            },
            statusCode: (int)ex.HttpStatusCode
        );
    }
    catch (Exception ex)
    {
        return Results.Json(
            new
            {
                success = false,
                message = "Backend error while reading Calendar events.",
                error = ex.Message,
                details = ex.ToString()
            },
            statusCode: 500
        );
    }
});
app.MapPost("/api/google/calendar/events/create", async (
    IConfiguration configuration,
    JsonElement body,
    CancellationToken cancellationToken
) =>
{
    try
    {
        var credential = CreateGoogleCredential(configuration);

        if (credential == null)
        {
            return Results.Json(
                new
                {
                    success = false,
                    message = "Google OAuth token not found. Please connect Google first at /api/google/oauth/login."
                },
                statusCode: 401
            );
        }

        if (credential.Token.IsExpired(Google.Apis.Util.SystemClock.Default))
        {
            var refreshed = await credential.RefreshTokenAsync(cancellationToken);

            if (!refreshed)
            {
                return Results.Json(
                    new
                    {
                        success = false,
                        message = "Google OAuth token expired and refresh failed. Please connect Google again."
                    },
                    statusCode: 401
                );
            }
        }

        var summary = body.TryGetProperty("summary", out var summaryProp)
            ? summaryProp.GetString()
            : "Live Class Session";

        var description = body.TryGetProperty("description", out var descriptionProp)
            ? descriptionProp.GetString()
            : "";

        var start = body.TryGetProperty("start", out var startProp)
            ? startProp.GetString()
            : null;

        var end = body.TryGetProperty("end", out var endProp)
            ? endProp.GetString()
            : null;

        var timeZone = body.TryGetProperty("timeZone", out var timeZoneProp)
            ? timeZoneProp.GetString()
            : "Asia/Ho_Chi_Minh";

        if (string.IsNullOrWhiteSpace(start) || string.IsNullOrWhiteSpace(end))
        {
            return Results.BadRequest(new
            {
                success = false,
                message = "Missing start or end. Example: 2026-05-10T17:30:00+07:00"
            });
        }

        var attendeeEmails = new List<string>();

        if (body.TryGetProperty("attendees", out var attendeesProp) &&
            attendeesProp.ValueKind == JsonValueKind.Array)
        {
            foreach (var attendee in attendeesProp.EnumerateArray())
            {
                var email = attendee.GetString();

                if (!string.IsNullOrWhiteSpace(email))
                {
                    attendeeEmails.Add(email.Trim());
                }
            }
        }

        var calendarService = new CalendarService(
            new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "Algo Live Class Portal"
            }
        );

        var calendarEvent = new Event
        {
            Summary = summary,
            Description = description,
            Start = new EventDateTime
            {
                DateTimeRaw = start,
                TimeZone = timeZone
            },
            End = new EventDateTime
            {
                DateTimeRaw = end,
                TimeZone = timeZone
            },
            Attendees = attendeeEmails
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Select(email => new EventAttendee
                {
                    Email = email
                })
                .ToList(),
            ConferenceData = new ConferenceData
            {
                CreateRequest = new CreateConferenceRequest
                {
                    RequestId = Guid.NewGuid().ToString("N"),
                    ConferenceSolutionKey = new ConferenceSolutionKey
                    {
                        Type = "hangoutsMeet"
                    }
                }
            }
        };

        var insertRequest = calendarService.Events.Insert(calendarEvent, "primary");
        insertRequest.ConferenceDataVersion = 1;
        insertRequest.SendUpdates = EventsResource.InsertRequest.SendUpdatesEnum.All;

        var createdEvent = await insertRequest.ExecuteAsync(cancellationToken);

        var meetLink = createdEvent.HangoutLink
            ?? createdEvent.ConferenceData?.EntryPoints?
                .FirstOrDefault(entryPoint =>
                    string.Equals(entryPoint.EntryPointType, "video", StringComparison.OrdinalIgnoreCase)
                )?.Uri;

        var meetingCode = NormalizeMeetingCode(meetLink);

        return Results.Ok(new
        {
            success = true,
            eventId = createdEvent.Id,
            summary = createdEvent.Summary,
            htmlLink = createdEvent.HtmlLink,
            start = createdEvent.Start?.DateTimeRaw,
            end = createdEvent.End?.DateTimeRaw,
            meetLink,
            meetingCode,
            attendees = createdEvent.Attendees?.Select(attendee => new
            {
                email = attendee.Email,
                responseStatus = attendee.ResponseStatus
            })
        });
    }
    catch (Google.GoogleApiException ex)
    {
        return Results.Json(
            new
            {
                success = false,
                message = "Google API error while creating Calendar event.",
                statusCode = ex.HttpStatusCode,
                error = ex.Error?.Message,
                details = ex.ToString()
            },
            statusCode: (int)ex.HttpStatusCode
        );
    }
    catch (Exception ex)
    {
        return Results.Json(
            new
            {
                success = false,
                message = "Backend error while creating Calendar event.",
                error = ex.Message,
                details = ex.ToString()
            },
            statusCode: 500
        );
    }
});
app.Run();

public class LiveClassTrackingRequest
{
    public string? UserId { get; set; }
    public string? UserName { get; set; }
    public string? Email { get; set; }
    public string? GroupCode { get; set; }
    public string? LessonId { get; set; }
    public string? MeetLink { get; set; }
    public string? ClientTimestamp { get; set; }

    public bool? CameraReady { get; set; }
    public bool? MicrophoneReady { get; set; }
    public bool? ScreenReady { get; set; }
    public bool? JoinedMeet { get; set; }
}

public class LiveTrackingEventRecord
{
    public string Id { get; set; } = "";
    public string EventType { get; set; } = "";
    public string UserId { get; set; } = "";
    public string UserName { get; set; } = "";
    public string Email { get; set; } = "";
    public string GroupCode { get; set; } = "";
    public string LessonId { get; set; } = "";
    public string MeetLink { get; set; } = "";
    public DateTime ReceivedAt { get; set; }
    public string ClientTimestamp { get; set; } = "";
    public Dictionary<string, string> Metadata { get; set; } = new();
}
public class CreateClassroomDemoRequest
{
    public string? Name { get; set; }
    public string? Section { get; set; }
    public string? Subject { get; set; }
    public string? Room { get; set; }
    public string? OwnerId { get; set; }
    public List<string>? CoTeacherEmails { get; set; }
}