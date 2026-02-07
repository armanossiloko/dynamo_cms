namespace Dynamo.CMS.API.Contracts;

public class ComponentDto
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string DisplayName { get; set; }
    public string? Description { get; set; }
    public string Category { get; set; } = "Content";
    public string? Icon { get; set; }
    public required Dictionary<string, object> Schema { get; set; }
    public Dictionary<string, object>? DefaultData { get; set; }
    public Dictionary<string, object>? ValidationRules { get; set; }
    public bool IsSystem { get; set; }
    public bool IsActive { get; set; }
    public bool AllowMultiple { get; set; }
    public int? MaxInstances { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
}

public class CreateComponentDto
{
    public required string Name { get; set; }
    public required string DisplayName { get; set; }
    public string? Description { get; set; }
    public string Category { get; set; } = "Content";
    public string? Icon { get; set; }
    public required Dictionary<string, object> Schema { get; set; }
    public Dictionary<string, object>? DefaultData { get; set; }
    public Dictionary<string, object>? ValidationRules { get; set; }
    public bool AllowMultiple { get; set; } = true;
    public int? MaxInstances { get; set; }
}

public class UpdateComponentDto
{
    public string? DisplayName { get; set; }
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string? Icon { get; set; }
    public Dictionary<string, object>? Schema { get; set; }
    public Dictionary<string, object>? DefaultData { get; set; }
    public Dictionary<string, object>? ValidationRules { get; set; }
    public bool? IsActive { get; set; }
    public bool? AllowMultiple { get; set; }
    public int? MaxInstances { get; set; }
}

public class ComponentInstanceDto
{
    public required string ComponentName { get; set; }
    public Dictionary<string, object> Data { get; set; } = [];
    public int? Order { get; set; }
}

public class ValidateComponentDto
{
    public required string ComponentName { get; set; }
    public Dictionary<string, object> Data { get; set; } = [];
}

public class ComponentValidationResultDto
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = [];
}

public class ComponentCategoryDto
{
    public required string Name { get; set; }
    public string? Icon { get; set; }
    public int ComponentCount { get; set; }
}
