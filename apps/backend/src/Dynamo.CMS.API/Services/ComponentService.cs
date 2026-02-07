using Dynamo.CMS.API.Contracts;
using Dynamo.CMS.API.Data;
using Dynamo.CMS.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Dynamo.CMS.API.Services;

public interface IComponentService
{
    Task<List<ComponentDto>> GetAllComponentsAsync();
    Task<List<ComponentDto>> GetComponentsByCategoryAsync(string category);
    Task<ComponentDto?> GetComponentByNameAsync(string name);
    Task<ComponentDto?> GetComponentByIdAsync(int id);
    Task<ComponentDto> CreateComponentAsync(CreateComponentDto dto, string userId);
    Task<ComponentDto?> UpdateComponentAsync(int id, UpdateComponentDto dto);
    Task<bool> DeleteComponentAsync(int id);
    Task<List<ComponentCategoryDto>> GetCategoriesAsync();
    Task<ComponentValidationResultDto> ValidateComponentAsync(string componentName, Dictionary<string, object> data);
}

public class ComponentService : IComponentService
{
    private readonly AppDbContext _context;

    public ComponentService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ComponentDto>> GetAllComponentsAsync()
    {
        return await _context.Components
            .Where(c => c.IsActive)
            .OrderBy(c => c.Category)
            .ThenBy(c => c.DisplayName)
            .Select(c => new ComponentDto
            {
                Id = c.Id,
                Name = c.Name,
                DisplayName = c.DisplayName,
                Description = c.Description,
                Category = c.Category,
                Icon = c.Icon,
                Schema = c.Schema,
                DefaultData = c.DefaultData,
                ValidationRules = c.ValidationRules,
                IsSystem = c.IsSystem,
                IsActive = c.IsActive,
                AllowMultiple = c.AllowMultiple,
                MaxInstances = c.MaxInstances,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,
                CreatedBy = c.CreatedBy
            })
            .ToListAsync();
    }

    public async Task<List<ComponentDto>> GetComponentsByCategoryAsync(string category)
    {
        return await _context.Components
            .Where(c => c.IsActive && c.Category == category)
            .OrderBy(c => c.DisplayName)
            .Select(c => new ComponentDto
            {
                Id = c.Id,
                Name = c.Name,
                DisplayName = c.DisplayName,
                Description = c.Description,
                Category = c.Category,
                Icon = c.Icon,
                Schema = c.Schema,
                DefaultData = c.DefaultData,
                ValidationRules = c.ValidationRules,
                IsSystem = c.IsSystem,
                IsActive = c.IsActive,
                AllowMultiple = c.AllowMultiple,
                MaxInstances = c.MaxInstances,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,
                CreatedBy = c.CreatedBy
            })
            .ToListAsync();
    }

    public async Task<ComponentDto?> GetComponentByNameAsync(string name)
    {
        var component = await _context.Components.FirstOrDefaultAsync(c => c.Name == name);
        if (component == null) return null;

        return new ComponentDto
        {
            Id = component.Id,
            Name = component.Name,
            DisplayName = component.DisplayName,
            Description = component.Description,
            Category = component.Category,
            Icon = component.Icon,
            Schema = component.Schema,
            DefaultData = component.DefaultData,
            ValidationRules = component.ValidationRules,
            IsSystem = component.IsSystem,
            IsActive = component.IsActive,
            AllowMultiple = component.AllowMultiple,
            MaxInstances = component.MaxInstances,
            CreatedAt = component.CreatedAt,
            UpdatedAt = component.UpdatedAt,
            CreatedBy = component.CreatedBy
        };
    }

    public async Task<ComponentDto?> GetComponentByIdAsync(int id)
    {
        var component = await _context.Components.FindAsync(id);
        if (component == null) return null;

        return new ComponentDto
        {
            Id = component.Id,
            Name = component.Name,
            DisplayName = component.DisplayName,
            Description = component.Description,
            Category = component.Category,
            Icon = component.Icon,
            Schema = component.Schema,
            DefaultData = component.DefaultData,
            ValidationRules = component.ValidationRules,
            IsSystem = component.IsSystem,
            IsActive = component.IsActive,
            AllowMultiple = component.AllowMultiple,
            MaxInstances = component.MaxInstances,
            CreatedAt = component.CreatedAt,
            UpdatedAt = component.UpdatedAt,
            CreatedBy = component.CreatedBy
        };
    }

    public async Task<ComponentDto> CreateComponentAsync(CreateComponentDto dto, string userId)
    {
        var component = new ComponentDefinition
        {
            Name = dto.Name,
            DisplayName = dto.DisplayName,
            Description = dto.Description,
            Category = dto.Category,
            Icon = dto.Icon,
            Schema = dto.Schema,
            DefaultData = dto.DefaultData,
            ValidationRules = dto.ValidationRules,
            AllowMultiple = dto.AllowMultiple,
            MaxInstances = dto.MaxInstances,
            CreatedBy = userId
        };

        _context.Components.Add(component);
        await _context.SaveChangesAsync();

        return new ComponentDto
        {
            Id = component.Id,
            Name = component.Name,
            DisplayName = component.DisplayName,
            Description = component.Description,
            Category = component.Category,
            Icon = component.Icon,
            Schema = component.Schema,
            DefaultData = component.DefaultData,
            ValidationRules = component.ValidationRules,
            IsSystem = component.IsSystem,
            IsActive = component.IsActive,
            AllowMultiple = component.AllowMultiple,
            MaxInstances = component.MaxInstances,
            CreatedAt = component.CreatedAt,
            UpdatedAt = component.UpdatedAt,
            CreatedBy = component.CreatedBy
        };
    }

    public async Task<ComponentDto?> UpdateComponentAsync(int id, UpdateComponentDto dto)
    {
        var component = await _context.Components.FindAsync(id);
        if (component == null) return null;

        if (dto.DisplayName != null) component.DisplayName = dto.DisplayName;
        if (dto.Description != null) component.Description = dto.Description;
        if (dto.Category != null) component.Category = dto.Category;
        if (dto.Icon != null) component.Icon = dto.Icon;
        if (dto.Schema != null) component.Schema = dto.Schema;
        if (dto.DefaultData != null) component.DefaultData = dto.DefaultData;
        if (dto.ValidationRules != null) component.ValidationRules = dto.ValidationRules;
        if (dto.IsActive.HasValue) component.IsActive = dto.IsActive.Value;
        if (dto.AllowMultiple.HasValue) component.AllowMultiple = dto.AllowMultiple.Value;
        if (dto.MaxInstances.HasValue) component.MaxInstances = dto.MaxInstances.Value;

        component.UpdatedAt = DateTime.UtcNow;

        _context.Components.Update(component);
        await _context.SaveChangesAsync();

        return new ComponentDto
        {
            Id = component.Id,
            Name = component.Name,
            DisplayName = component.DisplayName,
            Description = component.Description,
            Category = component.Category,
            Icon = component.Icon,
            Schema = component.Schema,
            DefaultData = component.DefaultData,
            ValidationRules = component.ValidationRules,
            IsSystem = component.IsSystem,
            IsActive = component.IsActive,
            AllowMultiple = component.AllowMultiple,
            MaxInstances = component.MaxInstances,
            CreatedAt = component.CreatedAt,
            UpdatedAt = component.UpdatedAt,
            CreatedBy = component.CreatedBy
        };
    }

    public async Task<bool> DeleteComponentAsync(int id)
    {
        var component = await _context.Components.FindAsync(id);
        if (component == null) return false;

        if (component.IsSystem)
        {
            throw new InvalidOperationException("Cannot delete system components");
        }

        _context.Components.Remove(component);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<ComponentCategoryDto>> GetCategoriesAsync()
    {
        var categories = await _context.Components
            .Where(c => c.IsActive)
            .GroupBy(c => c.Category)
            .Select(g => new ComponentCategoryDto
            {
                Name = g.Key,
                ComponentCount = g.Count()
            })
            .ToListAsync();

        return categories;
    }

    public async Task<ComponentValidationResultDto> ValidateComponentAsync(string componentName, Dictionary<string, object> data)
    {
        var component = await _context.Components.FirstOrDefaultAsync(c => c.Name == componentName);
        if (component == null)
        {
            return new ComponentValidationResultDto
            {
                IsValid = false,
                Errors = [$"Component '{componentName}' not found"]
            };
        }

        var errors = new List<string>();
        
        // Basic validation - check required fields exist in schema
        if (component.Schema.TryGetValue("fields", out var fieldsObj) && fieldsObj is List<Dictionary<string, object>> fields)
        {
            foreach (var field in fields)
            {
                if (field.TryGetValue("required", out var required) && required is true)
                {
                    if (field.TryGetValue("name", out var name) && name is string fieldName)
                    {
                        if (!data.ContainsKey(fieldName) || data[fieldName] == null)
                        {
                            errors.Add($"Required field '{fieldName}' is missing");
                        }
                    }
                }
            }
        }

        return new ComponentValidationResultDto
        {
            IsValid = errors.Count == 0,
            Errors = errors
        };
    }
}
