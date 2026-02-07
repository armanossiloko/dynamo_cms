using Dynamo.CMS.API.Data;
using Dynamo.CMS.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Dynamo.CMS.API.Services;

public interface IContentSchedulerService
{
    Task<ScheduledJob> ScheduleJobAsync(string jobType, string collectionName, int entryId, DateTime scheduledAt, string userId);
    Task<IEnumerable<ScheduledJob>> GetPendingJobsAsync();
    Task<IEnumerable<ScheduledJob>> GetJobsForEntryAsync(string collectionName, int entryId);
    Task MarkJobCompletedAsync(int jobId);
    Task CancelJobAsync(int jobId);
}

public class ContentSchedulerService : IContentSchedulerService
{
    private readonly AppDbContext _context;
    private readonly ILogger<ContentSchedulerService> _logger;

    public ContentSchedulerService(AppDbContext context, ILogger<ContentSchedulerService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ScheduledJob> ScheduleJobAsync(string jobType, string collectionName, int entryId, DateTime scheduledAt, string userId)
    {
        var job = new ScheduledJob
        {
            JobType = jobType,
            CollectionName = collectionName,
            EntryId = entryId,
            ScheduledAt = scheduledAt,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        };

        _context.ScheduledJobs.Add(job);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Scheduled {JobType} job for {Collection}/{EntryId} at {ScheduledAt}", 
            jobType, collectionName, entryId, scheduledAt);
        
        return job;
    }

    public async Task<IEnumerable<ScheduledJob>> GetPendingJobsAsync()
    {
        return await _context.ScheduledJobs
            .Where(j => !j.IsCompleted && j.ScheduledAt <= DateTime.UtcNow)
            .OrderBy(j => j.ScheduledAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<ScheduledJob>> GetJobsForEntryAsync(string collectionName, int entryId)
    {
        return await _context.ScheduledJobs
            .Where(j => j.CollectionName == collectionName && j.EntryId == entryId)
            .OrderByDescending(j => j.CreatedAt)
            .ToListAsync();
    }

    public async Task MarkJobCompletedAsync(int jobId)
    {
        var job = await _context.ScheduledJobs.FindAsync(jobId);
        if (job != null)
        {
            job.IsCompleted = true;
            job.CompletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Marked job {JobId} as completed", jobId);
        }
    }

    public async Task CancelJobAsync(int jobId)
    {
        var job = await _context.ScheduledJobs.FindAsync(jobId);
        if (job != null && !job.IsCompleted)
        {
            _context.ScheduledJobs.Remove(job);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Cancelled job {JobId}", jobId);
        }
    }
}
