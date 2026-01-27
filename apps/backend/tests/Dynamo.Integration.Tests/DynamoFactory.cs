using Dynamo.CMS.API.Data;
using Dynamo.CMS.API.Options;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Npgsql;
using Testcontainers.PostgreSql;
using Xunit.Abstractions;

namespace Dynamo.Integration.Tests;

public class DynamoFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    /// <remarks>
    ///     The scope of a <see cref="_dbContainer"/> is per test class, not per test method!
    /// </remarks>
    private readonly PostgreSqlContainer _dbContainer = new PostgreSqlBuilder()
        .WithUsername("dynamo")
        .WithPassword("dynamo")
        .WithDatabase("dynamodb")
        .Build();
    private readonly IMessageSink _messageSink;

    public DynamoFactory(IMessageSink messageSink)
    {
        _messageSink = messageSink;
    }

    protected override IWebHostBuilder? CreateWebHostBuilder()
    {
        var builder = base.CreateWebHostBuilder();
        //builder.UseEnvironment();
        return builder;
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        //builder.UseSerilog((_, loggerConfiguration) =>
        //{
        //    loggerConfiguration.WriteTo.Console();
        //    loggerConfiguration.WriteTo.TestOutput(_messageSink);
        //});

        return base.CreateHost(builder);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureLogging(logging =>
        {
            logging.ClearProviders();
            logging.SetMinimumLevel(LogLevel.Trace);
            logging.AddConsole();
            //logging.AddXUnit(_output);
        });

        builder.ConfigureAppConfiguration((ctx, builder) =>
        {
            builder.Sources.Clear();

            // Find why .NET prioritizes this fucking dictionary over everything
            // Also find out why appsettings.ENV.json is not loaded at all even though the environment is set correctly.
            var defaultConfiguration = new Dictionary<string, string?>()
            {
                ["ConnectionStrings:Database"] = _dbContainer.GetConnectionString(),
                [$"{ApplicationOptions.OptionsName}:{nameof(ApplicationOptions.Name)}"] = "Dynamo Integration Test(s)",
                //[$"{ApplicationOptions.OptionsName}:{DatabaseOptions.OptionsName}:{nameof(DatabaseOptions.DatabaseProvider)}"] = "PostgreSQL",
            };
            builder.AddInMemoryCollection(defaultConfiguration);

            // Tests can be ran from the CLI using one of the following:
            // - dotnet test -e ASPNETCORE_ENVIRONMENT=Test
            // - dotnet test --environment ASPNETCORE_ENVIRONMENT=Test
            // However, for the time being (due to Testcontainers limitations), only PostgreSQL is supported
            builder.SetBasePath(Directory.GetCurrentDirectory());
            builder
                //.AddJsonFile("appsettings.json", optional: true, reloadOnChange: false)
                .AddJsonFile($"appsettings.{ctx.HostingEnvironment.EnvironmentName}.json", optional: true, reloadOnChange: false);
            builder.AddEnvironmentVariables();
        });

        builder.ConfigureTestServices(services =>
        {
            // Remove existing DI registrations
            services.RemoveAll<DbContextOptions<AppDbContext>>();


            var dataSource = new NpgsqlDataSourceBuilder(_dbContainer.GetConnectionString())
                .EnableDynamicJson()
                .Build();

            // Add test DI registrations

            //services.AddPooledDbContextFactory<AppDbContext>((serviceProvider, options) =>
            //{
            //    options.UseNpgsql(
            //        dataSource,
            //        optionsBuilder => optionsBuilder.MigrationsAssembly(typeof(AppDbContext).Assembly.GetName().Name!)
            //        );
            //});

            services.AddDbContext<AppDbContext>((serviceProvider, options) =>
            {
                options.UseNpgsql(
                    dataSource,
                    optionsBuilder => optionsBuilder.MigrationsAssembly(typeof(AppDbContext).Assembly.GetName().Name!)
                    );

            });
        });
    }

    public async Task InitializeAsync()
    {
        await _dbContainer.StartAsync();
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await _dbContainer.StopAsync();
    }
}
