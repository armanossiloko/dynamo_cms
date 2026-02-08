using Dynamo.CMS.API.BackgroundServices;
using Dynamo.CMS.API.Data;
using Dynamo.CMS.API.GraphQL;
using Dynamo.CMS.API.Mapping;
using Dynamo.CMS.API.Models;
using Dynamo.CMS.API.Options;
using Dynamo.CMS.API.Services;
using Dynamo.CMS.API.Storage;
using HotChocolate.Execution;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using System.IO.Abstractions;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

var jwtOptions = builder.Configuration.GetSection(JwtOptions.OptionsName).Get<JwtOptions>()!;

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.OptionsName));
builder.Services.Configure<ApplicationOptions>(builder.Configuration.GetSection(ApplicationOptions.OptionsName));

builder.Services.AddSingleton<IFileSystem, FileSystem>();
builder.Services.AddSingleton<IFileManager, FileManager>();
builder.Services.AddHttpContextAccessor();

builder.Services.AddSingleton<CatalogMapper>();
builder.Services.AddSingleton<SqlValidator>();
builder.Services.AddSingleton<PostgreSQLGenerator>();
builder.Services.AddSingleton<ISlugService, SlugService>();

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

builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        // Allow multipart/form-data without requiring [FromForm] on all parameters
        options.SuppressConsumesConstraintForFormFileParameters = true;
    });

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
builder.Services.AddScoped<IUserManagementService, UserManagementService>();
builder.Services.AddScoped<IDynamicSwaggerService, DynamicSwaggerService>();
builder.Services.AddScoped<IFileUploadService, FileUploadService>();

// Phase 2 services
builder.Services.AddScoped<ILocalizationService, LocalizationService>();
builder.Services.AddScoped<IComponentService, ComponentService>();
builder.Services.AddScoped<IStorageProvider>(sp =>
{
    var configuration = sp.GetRequiredService<IConfiguration>();
    var storagePath = configuration.GetValue("Storage:LocalStoragePath", "files");
    var publicBaseUrl = configuration.GetValue("Storage:PublicBaseUrl", "/files");
    return new Dynamo.CMS.API.Storage.LocalStorageProvider(storagePath, publicBaseUrl);
});
builder.Services.AddScoped<IImageProcessingService, ImageProcessingService>();

// Phase 1 services
builder.Services.AddHttpClient<IWebhookService, WebhookService>();
builder.Services.AddScoped<IWebhookService, WebhookService>();
builder.Services.AddScoped<IContentSchedulerService, ContentSchedulerService>();
builder.Services.AddScoped<IVersioningService, VersioningService>();
builder.Services.AddScoped<ISingleTypeService, SingleTypeService>();

// Background services
builder.Services.AddHostedService<WebhookRetryBackgroundService>();

// Phase 3 - GraphQL Configuration
builder.Services.AddGraphQLServer()
    .AddQueryType<Query>()
    .AddMutationType<Mutation>()
    .AddSubscriptionType<Subscription>()
    .AddType<ComponentDefinitionType>()
    .AddType<ContentVersionType>()
    .AddType<WebhookType>()
    .AddType<WebhookDeliveryType>()
    .AddType<ContentTranslationType>()
    .AddType<LocaleType>()
    .AddType<UserType>()
    .AddAuthorization()
    .AddProjections()
    .AddFiltering()
    .AddSorting()
    .AddInMemorySubscriptions()
    .ModifyRequestOptions(opt =>
    {
        opt.IncludeExceptionDetails = builder.Environment.IsDevelopment();
    });

// Phase 3 - API Versioning
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new Asp.Versioning.ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
    options.ApiVersionReader = Asp.Versioning.ApiVersionReader.Combine(
        new Asp.Versioning.UrlSegmentApiVersionReader(),
        new Asp.Versioning.HeaderApiVersionReader("api-version"),
        new Asp.Versioning.QueryStringApiVersionReader("api-version")
    );
})
.AddApiExplorer(options =>
{
    options.GroupNameFormat = "'v'VVV";
    options.SubstituteApiVersionInUrl = true;
});

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
    
    // Note: Dynamic collection endpoints will be available at runtime
    // Users can access them via:
    // - /api/swagger/{collectionName} for specific collections
    // - /api/swagger/collections to list available collections
    app.UseSwaggerUI(options =>
    {
        options.RoutePrefix = "swagger";
        options.DocumentTitle = $"{app.Configuration["Application:Name"]} Swagger";
        options.EnableTryItOutByDefault();
        options.SwaggerEndpoint("/openapi/v1.json", "Default API v1");
        options.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.None);
    });
    app.UseSwaggerUI(options =>
    {
        options.RoutePrefix = "swagger/all";
        options.DocumentTitle = $"{app.Configuration["Application:Name"]} - All Collections API";
        options.EnableTryItOutByDefault();
        options.SwaggerEndpoint("/api/swagger/all?format=json", "All Collections API");
        options.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.None);
    });

    app.MapScalarApiReference("scalar", options =>
    {
        options
            .WithTitle($"{app.Configuration["Application:Name"]} Scalar")
            .WithFavicon("/favicon.ico")
            .WithOpenApiRoutePattern("/openapi/v1.json")
            .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);

        options.WithDefaultOpenAllTags(false);
    });
    app.MapScalarApiReference("scalar/all", options =>
    {
        options
            .WithTitle($"{app.Configuration["Application:Name"]} - All Collections API")
            .WithFavicon("/favicon.ico")
            .WithOpenApiRoutePattern("/api/swagger/all")
            .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);

        options.WithDefaultOpenAllTags(false);
    });
}

app.UseHttpsRedirection();
app.UseCors("AllowAll");

// Enable request body buffering for JSON requests (needed when manually reading Request.Body)
app.Use(async (context, next) =>
{
    if (context.Request.ContentType?.StartsWith("application/json") == true)
    {
        context.Request.EnableBuffering();
    }
    await next();
});

app.UseAuthentication();
app.UseAuthorization();

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
    .WithName("HealthCheck")
    .WithTags("Health")
    .AllowAnonymous();

app.MapControllers();

// GraphQL endpoint
app.MapGraphQL();

// GraphQL Schema SDL endpoint
app.MapGet("/graphql/sdl", async (IRequestExecutorResolver executorResolver) =>
{
    var executor = await executorResolver.GetRequestExecutorAsync();
    return Results.Text(executor.Schema.Print(), "application/graphql");
}).AllowAnonymous().ExcludeFromDescription();

// GraphQL Schema introspection endpoint — used by the frontend Voyager
app.MapGet("/graphql/schema", async (IRequestExecutorResolver executorResolver) =>
{
    var executor = await executorResolver.GetRequestExecutorAsync();

    const string introspectionQuery = """
        query IntrospectionQuery {
          __schema {
            queryType { name }
            mutationType { name }
            subscriptionType { name }
            types {
              kind name description
              fields(includeDeprecated: true) {
                name description
                args { name description type { ...TypeRef } defaultValue }
                type { ...TypeRef }
                isDeprecated deprecationReason
              }
              inputFields { name description type { ...TypeRef } defaultValue }
              interfaces { ...TypeRef }
              enumValues(includeDeprecated: true) { name description isDeprecated deprecationReason }
              possibleTypes { ...TypeRef }
            }
            directives {
              name description locations
              args { name description type { ...TypeRef } defaultValue }
            }
          }
        }
        fragment TypeRef on __Type {
          kind name
          ofType { kind name
            ofType { kind name
              ofType { kind name
                ofType { kind name
                  ofType { kind name
                    ofType { kind name }
                  }
                }
              }
            }
          }
        }
        """;

    var result = await executor.ExecuteAsync(
        OperationRequestBuilder.New()
            .SetDocument(introspectionQuery)
            .Build());

    return Results.Content(result.ToJson(), "application/json");
}).AllowAnonymous().ExcludeFromDescription();

// GraphQL Voyager — interactive schema visualization (standalone fallback)
app.MapGet("/voyager", () => Results.Content("""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dynamo CMS — GraphQL Voyager</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/graphql-voyager@2.1.0/dist/voyager.css" />
  <style>
    body { margin: 0; padding: 0; overflow: hidden; height: 100vh; }
    #voyager { height: 100vh; }
  </style>
</head>
<body>
  <div id="voyager"></div>
  <script src="https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/graphql-voyager@2.1.0/dist/voyager.standalone.js"></script>
  <script>
    fetch('/graphql/schema')
      .then(function(r) { return r.json(); })
      .then(function(introspection) {
        GraphQLVoyager.renderVoyager(document.getElementById('voyager'), {
          introspection: introspection,
          displayOptions: { skipRelay: false, showLeafFields: true }
        });
      });
  </script>
</body>
</html>
""", "text/html")).ExcludeFromDescription().AllowAnonymous();

app.Run();

public partial class Program { }
