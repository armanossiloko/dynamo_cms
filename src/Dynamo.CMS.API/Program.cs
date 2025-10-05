using Dynamo.CMS.API.Data;
using Dynamo.CMS.API.Mapping;
using Dynamo.CMS.API.Models;
using Dynamo.CMS.API.Options;
using Dynamo.CMS.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using System.IO.Abstractions;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

var jwtOptions = builder.Configuration.GetSection(JwtOptions.OptionsName).Get<JwtOptions>()!;
var applicationOptions = builder.Configuration.GetSection(ApplicationOptions.OptionsName).Get<ApplicationOptions>()!;

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.OptionsName));
builder.Services.Configure<ApplicationOptions>(builder.Configuration.GetSection(ApplicationOptions.OptionsName));
builder.Services.Configure<DatabaseOptions>(builder.Configuration.GetSection(DatabaseOptions.OptionsName));
builder.Services.Configure<StorageOptions>(builder.Configuration.GetSection(StorageOptions.OptionsName));

builder.Services.AddSingleton<IFileSystem, FileSystem>();
builder.Services.AddSingleton<IFileManager, FileManager>();

builder.Services.AddSingleton<CatalogMapper>();
builder.Services.AddSingleton<SqlValidator>();
builder.Services.AddSingleton<PostgreSQLGenerator>();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddIdentity<User, Role>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequiredLength = 6;

    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;

    options.User.RequireUniqueEmail = true;
})
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

// JWT Auth
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtOptions.Issuer,
        ValidAudience = jwtOptions.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key)),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Dynamo CMS API",
        Version = "v1",
        Description = "API for Dynamo CMS",
    });

    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
    {
        builder.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});

builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IIdentityService, IdentityService>();
builder.Services.AddScoped<IDynamicSwaggerService, DynamicSwaggerService>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var dbContext = services.GetRequiredService<AppDbContext>();
        dbContext.Database.Migrate();

        dbContext.Seed();

        var roleManager = services.GetRequiredService<RoleManager<Role>>();
        var userManager = services.GetRequiredService<UserManager<User>>();

        var roles = new[] { "Admin", "User" };
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new Role
                {
                    ConcurrencyStamp =  Guid.NewGuid().ToString(),
                    Name = role,
                    NormalizedName = role.ToUpper(),
                });
            }
        }

        var adminEmail = "admin@dynamo.com";
        var adminUser = await userManager.FindByEmailAsync(adminEmail);
        if (adminUser is null)
        {
            adminUser = new User
            {
                UserName = "admin",
                Email = adminEmail,
                FirstName = "Admin",
                LastName = "User",
                EmailConfirmed = true,
                CreatedAt = DateTimeOffset.UtcNow,
                IsActive = true,
            };

            var result = await userManager.CreateAsync(adminUser, "Dynamo123!");
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(adminUser, "Admin");
            }
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while seeding roles and admin user");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger(options =>
    {
        options.RouteTemplate = "/openapi/{documentName}.{extension:regex(^(json|ya?ml)$)}";
    });
    app.UseSwaggerUI(options =>
    {
        options.DocumentTitle = $"{app.Configuration["Application:Name"]} Swagger";
        options.EnableTryItOutByDefault();
        options.SwaggerEndpoint("/openapi/v1.json", $"{app.Configuration["Application:Name"]} - Main API");
        options.SwaggerEndpoint("/api/swagger/all?format=json", "All Collections API");
        options.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.None);

        // Note: Dynamic collection endpoints will be available at runtime
        // Users can access them via:
        // - /api/swagger/{collectionName} for specific collections
        // - /api/swagger/collections to list available collections
    });
    app.MapScalarApiReference(options =>
    {
        options.Title = $"{app.Configuration["Application:Name"]} Scalar UI";
        options.WithFavicon("/favicon.ico");
    });
}

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program { }
