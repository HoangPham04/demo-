using ClassroomBackend.Models;
using Microsoft.EntityFrameworkCore;

namespace ClassroomBackend.Data;

public class ClassroomDbContext : DbContext
{
    public ClassroomDbContext(DbContextOptions<ClassroomDbContext> options)
        : base(options)
    {
    }

    public DbSet<RecordingSession> RecordingSessions => Set<RecordingSession>();
    public DbSet<RecordingCronReport> RecordingCronReports => Set<RecordingCronReport>();

    public DbSet<SyncLogRecord> SyncLogs => Set<SyncLogRecord>();
    public DbSet<QuizAttemptRecord> QuizAttempts => Set<QuizAttemptRecord>();
}