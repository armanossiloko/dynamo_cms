using Dynamo.CMS.API.Models;
using Dynamo.CMS.API.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Dynamo.CMS.API.Data;

/// <summary>
/// Seeds illustrative demo data so the admin UI loads with realistic content,
/// matching the mock data in <c>refs/store.jsx</c>.
/// Toggle via configuration: Seed:DemoData:Enabled = true.
/// </summary>
public static class DemoDataSeeder
{
    /// <summary>Shared password for all demo workspace users (meets Identity policy).</summary>
    public const string DemoPassword = "DynamoDemo1!";

    private static readonly byte[] TinyPng =
        Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z5BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");

    public static async Task SeedAsync(
        AppDbContext db,
        UserManager<User> userManager,
        RoleManager<Role> roleManager,
        IFileManager fileManager,
        CancellationToken ct = default)
    {
        await EnsureRolesAsync(roleManager, ct);

        await SeedWebhooksAsync(db, ct);
        await SeedComponentsAsync(db, ct);
        await SeedMediaFoldersAsync(db, ct);
        await db.SaveChangesAsync(ct);

        await SeedWebhookDeliveriesAsync(db, ct);
        await SeedDemoUsersAsync(userManager, ct);
        await db.SaveChangesAsync(ct);

        await SeedApiKeysAsync(db, ct);
        await SeedMediaLibraryAsync(db, fileManager, ct);
        await db.SaveChangesAsync(ct);

        await SeedCollectionsAsync(db, ct);   // owns its SaveChanges for metadata + raw SQL
        await SeedContentVersionsAsync(db, ct);
        await SeedSingleTypesAsync(db, ct);   // owns its SaveChanges for type IDs
        await db.SaveChangesAsync(ct);
    }

    private static async Task EnsureRolesAsync(RoleManager<Role> roleManager, CancellationToken ct)
    {
        foreach (var role in new[] { "Admin", "User", "Editor", "Developer" })
        {
            ct.ThrowIfCancellationRequested();
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new Role
                {
                    Name = role,
                    NormalizedName = role.ToUpperInvariant(),
                    ConcurrencyStamp = Guid.NewGuid().ToString()
                });
            }
        }
    }

    // ── Webhooks ──────────────────────────────────────────────────────────────

    private static async Task SeedWebhooksAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.Webhooks.AnyAsync(ct)) return;

        db.Webhooks.AddRange(
            new Webhook
            {
                Name = "Vercel deploy",
                Url = "https://api.vercel.com/v1/integrations/deploy/prj_X9w...",
                HttpMethod = "POST",
                Events = new List<string> { WebhookEvents.EntryPublished, WebhookEvents.EntryUnpublished },
                IsActive = true,
                SuccessCount = 1284,
                FailureCount = 6
            },
            new Webhook
            {
                Name = "Slack — content team",
                Url = "https://hooks.slack.com/services/T012/B034/aGq...",
                HttpMethod = "POST",
                Events = new List<string> { WebhookEvents.EntryCreated, WebhookEvents.EntryUpdated },
                IsActive = true,
                SuccessCount = 642,
                FailureCount = 0
            },
            new Webhook
            {
                Name = "Algolia reindex",
                Url = "https://prod.algolia.net/1/indexes/articles/batch",
                HttpMethod = "POST",
                Events = new List<string>
                {
                    WebhookEvents.EntryCreated, WebhookEvents.EntryUpdated, WebhookEvents.EntryDeleted
                },
                IsActive = true,
                SuccessCount = 2188,
                FailureCount = 41
            },
            new Webhook
            {
                Name = "Legacy CMS mirror",
                Url = "https://legacy.example.com/wp-json/dynamo/mirror",
                HttpMethod = "POST",
                Events = new List<string> { WebhookEvents.EntryPublished },
                IsActive = false,
                SuccessCount = 0,
                FailureCount = 0
            },
            new Webhook
            {
                Name = "Analytics pipe",
                Url = "https://events.collector.io/v2/track",
                HttpMethod = "POST",
                Events = new List<string> { WebhookEvents.EntryPublished, WebhookEvents.CollectionCreated },
                IsActive = true,
                SuccessCount = 503,
                FailureCount = 2
            }
        );
    }

    private static async Task SeedWebhookDeliveriesAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.WebhookDeliveries.AnyAsync(ct)) return;

        var vercel = await db.Webhooks.FirstOrDefaultAsync(w => w.Name == "Vercel deploy", ct);
        if (vercel is null) return;

        var now = DateTime.UtcNow;
        var samples = new[]
        {
            (WebhookEvents.EntryPublished,   200, true,  184,  now.AddHours(-1)),
            (WebhookEvents.EntryPublished,   200, true,  211,  now.AddHours(-3)),
            (WebhookEvents.EntryUnpublished, 500, false, 4012, now.AddHours(-5)),
            (WebhookEvents.EntryPublished,   200, true,  167,  now.AddDays(-1).AddHours(-6)),
            (WebhookEvents.EntryPublished,   200, true,  198,  now.AddDays(-1).AddHours(-9)),
            (WebhookEvents.EntryPublished,   502, false, 3211, now.AddDays(-1).AddHours(-15)),
            (WebhookEvents.EntryUnpublished, 200, true,  156,  now.AddDays(-3)),
        };

        foreach (var (eventName, status, success, duration, sentAt) in samples)
        {
            db.WebhookDeliveries.Add(new WebhookDelivery
            {
                WebhookId = vercel.Id,
                EventName = eventName,
                Payload = new Dictionary<string, object>
                {
                    ["event"] = eventName,
                    ["collection"] = "articles",
                    ["entryId"] = 1
                },
                StatusCode = status,
                IsSuccess = success,
                ErrorMessage = success ? null : "Upstream returned an error",
                Response = success ? "{\"ok\":true}" : null,
                SentAt = sentAt,
                CompletedAt = sentAt.AddMilliseconds(duration),
                DurationMs = duration
            });
        }
    }

    // ── Components ────────────────────────────────────────────────────────────

    private static async Task SeedComponentsAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.Components.AnyAsync(ct)) return;

        static object Field(string name, string type) => new Dictionary<string, object>
        {
            ["name"] = name,
            ["type"] = type
        };

        ComponentDefinition Comp(string name, string display, string category, string icon, int fieldCount) =>
            new()
            {
                Name = name,
                DisplayName = display,
                Category = category,
                Icon = icon,
                IsActive = true,
                Schema = new Dictionary<string, object>
                {
                    ["fields"] = Enumerable.Range(1, fieldCount)
                        .Select(i => Field($"field{i}", "string"))
                        .ToArray()
                }
            };

        db.Components.AddRange(
            Comp("hero",        "Hero block",     "Layout",    "image",  4),
            Comp("two_column",  "Two column",     "Layout",    "layers", 3),
            Comp("quote",       "Pull quote",     "Editorial", "quote",  2),
            Comp("gallery",     "Image gallery",  "Media",     "photo",  3),
            Comp("cta",         "Call to action", "Marketing", "send",   5),
            Comp("embed",       "Embed",          "Media",     "code",   2),
            Comp("faq",         "FAQ list",       "Editorial", "list",   1),
            Comp("testimonial", "Testimonial",    "Marketing", "user",   4)
        );
    }

    // ── Media Folders ─────────────────────────────────────────────────────────

    private static async Task SeedMediaFoldersAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.MediaFolders.AnyAsync(ct)) return;

        db.MediaFolders.AddRange(
            new MediaFolder { Name = "articles", Path = "/articles" },
            new MediaFolder { Name = "authors",  Path = "/authors"  },
            new MediaFolder { Name = "brand",    Path = "/brand"    },
            new MediaFolder { Name = "press",    Path = "/press"    },
            new MediaFolder { Name = "videos",   Path = "/videos"   }
        );
    }

    // ── Demo users (refs/store.jsx → users) ───────────────────────────────────

    private static async Task SeedDemoUsersAsync(UserManager<User> userManager, CancellationToken ct)
    {
        var demoUsers = new (string First, string Last, string Email, string Role, bool Active)[]
        {
            ("Mara",  "Voss",   "mara@dynamo.io",  "Admin",     true),
            ("Jules", "Okafor", "jules@dynamo.io", "Editor",    true),
            ("Anya",  "Petrov", "anya@dynamo.io",  "Editor",    true),
            ("Theo",  "Lin",    "theo@dynamo.io",  "Developer", true),
            ("Sana",  "Khoury", "sana@dynamo.io",  "Editor",    false),
        };

        foreach (var (first, last, email, role, active) in demoUsers)
        {
            ct.ThrowIfCancellationRequested();
            var existing = await userManager.FindByEmailAsync(email);
            if (existing is not null)
            {
                if (!await userManager.IsInRoleAsync(existing, role))
                    await userManager.AddToRoleAsync(existing, role);
                continue;
            }

            var userName = email.Split('@')[0];
            var user = new User
            {
                UserName = userName,
                Email = email,
                FirstName = first,
                LastName = last,
                EmailConfirmed = true,
                CreatedAt = DateTimeOffset.UtcNow,
                IsActive = active
            };

            var result = await userManager.CreateAsync(user, DemoPassword);
            if (result.Succeeded)
                await userManager.AddToRoleAsync(user, role);
        }
    }

    // ── API keys (refs/store.jsx → apiKeys) ───────────────────────────────────

    private static async Task SeedApiKeysAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.ApiKeys.AnyAsync(ct)) return;

        var owner = await db.Users.FirstOrDefaultAsync(u => u.Email == "mara@dynamo.io", ct)
            ?? await db.Users.OrderBy(u => u.Id).FirstOrDefaultAsync(ct);
        if (owner is null) return;

        var now = DateTime.UtcNow;
        var seeds = new (string Name, ApiKeyScope Scope, List<string>? Collections, DateTime? Expires, bool Active, DateTime? LastUsed)[]
        {
            ("Production frontend",  ApiKeyScope.ReadOnly, ["articles", "authors", "categories"], null,                          true,  now.AddMinutes(-12)),
            ("Editorial CMS bridge", ApiKeyScope.Write,    ["articles"],                         now.AddMonths(9),              true,  now.AddHours(-1)),
            ("Analytics ingest",     ApiKeyScope.ReadOnly, null,                                 now.AddMonths(4),              true,  now.AddDays(-4)),
            ("Mobile beta",          ApiKeyScope.Full,     ["articles", "authors", "categories", "events", "products"], now.AddMonths(2), true, now.AddDays(-21)),
            ("Old preview",          ApiKeyScope.ReadOnly, ["articles"],                         now.AddMonths(-1),             false, now.AddMonths(-1)),
        };

        var index = 0;
        foreach (var (name, scope, collections, expires, active, lastUsed) in seeds)
        {
            index++;
            var plain = $"dk_live_demo_seed_{index:D2}_not_for_production_use";
            db.ApiKeys.Add(new ApiKey
            {
                Name = name,
                KeyHash = HashApiKey(plain),
                Scope = scope,
                AllowedCollections = collections,
                ExpiresAt = expires,
                IsActive = active,
                CreatedAt = now.AddMonths(-2),
                UpdatedAt = now,
                LastUsedAt = lastUsed,
                UserId = owner.Id,
                CreatedBy = owner.Id.ToString()
            });
        }
    }

    // ── Media library (refs/store.jsx → media) ────────────────────────────────

    private static async Task SeedMediaLibraryAsync(AppDbContext db, IFileManager fileManager, CancellationToken ct)
    {
        if (await db.UploadedFiles.AnyAsync(f => f.CollectionName == null, ct)) return;

        var folders = await db.MediaFolders.ToDictionaryAsync(f => f.Name, f => f.Id, ct);
        var owner = await db.Users.FirstOrDefaultAsync(u => u.Email == "mara@dynamo.io", ct);

        var seeds = new (string FileName, string ContentType, byte[] Bytes, long Size, string Folder, string? Alt, int DaysAgo)[]
        {
            ("cover-01.jpg",   "image/jpeg",       TinyPng, 2_516_582, "articles", "Late afternoon studio light on a marble desk.", 2),
            ("cover-02.jpg",   "image/jpeg",       TinyPng, 3_251_658, "articles", "Folded newspapers on linen.", 4),
            ("cover-03.jpg",   "image/jpeg",       TinyPng, 1_887_436, "articles", "Cropped editorial portrait.", 7),
            ("press-kit.pdf",  "application/pdf",  "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"u8.ToArray(), 655_360, "press", null, 21),
            ("logo-mark.svg",  "image/svg+xml",    "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"512\" height=\"512\"><rect fill=\"#E85D38\" width=\"512\" height=\"512\"/></svg>"u8.ToArray(), 8_192, "brand", null, 14),
            ("trailer.mp4",    "video/mp4",        [0x00, 0x00, 0x00, 0x18], 25_165_824, "videos", null, 11),
            ("av-mara.jpg",    "image/jpeg",       TinyPng, 184_320, "authors", null, 18),
            ("av-jules.jpg",   "image/jpeg",       TinyPng, 196_608, "authors", null, 18),
            ("av-anya.jpg",    "image/jpeg",       TinyPng, 215_040, "authors", null, 18),
            ("cover-05.jpg",   "image/jpeg",       TinyPng, 2_097_152, "articles", null, 30),
            ("cover-07.jpg",   "image/jpeg",       TinyPng, 1_677_722, "articles", null, 42),
            ("cover-08.jpg",   "image/jpeg",       TinyPng, 2_306_867, "articles", null, 55),
        };

        foreach (var (fileName, contentType, bytes, size, folder, alt, daysAgo) in seeds)
        {
            ct.ThrowIfCancellationRequested();
            folders.TryGetValue(folder, out var folderId);

            var path = await fileManager.UploadAsync(
                fileName,
                bytes,
                "media-library",
                [folder],
                ct);

            db.UploadedFiles.Add(new UploadedFileEntity
            {
                FileName = fileName,
                OriginalFileName = fileName,
                FilePath = path,
                ContentType = contentType,
                FileSize = size,
                DisplayName = fileName,
                CollectionName = null,
                UploadedAt = DateTimeOffset.UtcNow.AddDays(-daysAgo),
                UploadedBy = owner?.Id,
                FolderId = folderId,
                AltText = alt,
                Metadata = new Dictionary<string, object>
                {
                    ["seed"] = true,
                    ["folder"] = folder
                }
            });
        }
    }

    private static string HashApiKey(string plainKey)
    {
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(plainKey));
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    // ── Collections + dynamic tables + entries ────────────────────────────────

    private static async Task SeedCollectionsAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.DataCollections.AnyAsync(ct)) return;

        // Helper so column definitions stay concise
        static DataCollectionColumn Col(
            DataCollection parent,
            string name, string display, string baseType,
            bool nullable, bool visible,
            bool unique = false, bool autoIncrement = false,
            string? customProps = null) => new()
        {
            DataCollection = parent,
            Name = name,
            DisplayName = display,
            BaseTypeName = baseType,
            Nullable = nullable,
            Visible = visible,
            Unique = unique,
            AutoIncrement = autoIncrement,
            CustomProperties = customProps,
        };

        // ── authors ───────────────────────────────────────────────────────────
        var authors = new DataCollection { Name = "authors", DisplayName = "Authors" };
        authors.Columns =
        [
            Col(authors, "id",     "ID",     "integer", nullable: false, visible: true,  unique: true, autoIncrement: true),
            Col(authors, "name",   "Name",   "string",  nullable: false, visible: true),
            Col(authors, "email",  "Email",  "string",  nullable: false, visible: true,  unique: true),
            Col(authors, "bio",    "Bio",    "text",    nullable: true,  visible: false),
            Col(authors, "avatar", "Avatar", "file",    nullable: true,  visible: true),
        ];

        // ── articles ──────────────────────────────────────────────────────────
        var articles = new DataCollection { Name = "articles", DisplayName = "Articles" };
        articles.Columns =
        [
            Col(articles, "id",          "ID",        "integer",  nullable: false, visible: true,  unique: true, autoIncrement: true),
            Col(articles, "title",       "Title",     "string",   nullable: false, visible: true),
            Col(articles, "slug",        "Slug",      "slug",     nullable: false, visible: true,  unique: true),
            Col(articles, "author",      "Author",    "reference",nullable: true,  visible: true,
                customProps: """{"reference":{"dataCollection":"authors","property":"id"}}"""),
            Col(articles, "body",        "Body",      "richtext", nullable: true,  visible: false),
            Col(articles, "cover",       "Cover",     "file",     nullable: true,  visible: true),
            Col(articles, "publishedAt", "Published", "datetime", nullable: true,  visible: true),
            Col(articles, "featured",    "Featured",  "boolean",  nullable: false, visible: true),
        ];

        // ── products ──────────────────────────────────────────────────────────
        var products = new DataCollection { Name = "products", DisplayName = "Products" };
        products.Columns =
        [
            Col(products, "id",      "ID",       "integer", nullable: false, visible: true,  unique: true, autoIncrement: true),
            Col(products, "sku",     "SKU",      "string",  nullable: false, visible: true,  unique: true),
            Col(products, "title",   "Title",    "string",  nullable: false, visible: true),
            Col(products, "price",   "Price",    "decimal", nullable: false, visible: true),
            Col(products, "stock",   "Stock",    "integer", nullable: false, visible: true),
            Col(products, "inStock", "In stock", "boolean", nullable: false, visible: true),
        ];

        // ── categories ────────────────────────────────────────────────────────
        var categories = new DataCollection { Name = "categories", DisplayName = "Categories" };
        categories.Columns =
        [
            Col(categories, "id",   "ID",   "integer", nullable: false, visible: true, unique: true, autoIncrement: true),
            Col(categories, "name", "Name", "string",  nullable: false, visible: true),
            Col(categories, "slug", "Slug", "slug",    nullable: false, visible: true, unique: true),
        ];

        // ── events ────────────────────────────────────────────────────────────
        var events = new DataCollection { Name = "events", DisplayName = "Events" };
        events.Columns =
        [
            Col(events, "id",       "ID",     "integer",  nullable: false, visible: true, unique: true, autoIncrement: true),
            Col(events, "title",    "Title",  "string",   nullable: false, visible: true),
            Col(events, "startsAt", "Starts", "datetime", nullable: false, visible: true),
            Col(events, "venue",    "Venue",  "string",   nullable: true,  visible: true),
        ];

        db.DataCollections.AddRange(authors, articles, products, categories, events);
        await db.SaveChangesAsync(ct); // persist metadata before touching raw tables

        // ── Create dynamic PostgreSQL tables ──────────────────────────────────

        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS "authors" (
                "id"     SERIAL UNIQUE,
                "name"   varchar NOT NULL,
                "email"  varchar NOT NULL UNIQUE,
                "bio"    text NULL,
                "avatar" jsonb NULL
            )
            """, ct);

        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS "articles" (
                "id"          SERIAL UNIQUE,
                "title"       varchar NOT NULL,
                "slug"        varchar NOT NULL UNIQUE,
                "author"      jsonb NULL,
                "body"        jsonb NULL,
                "cover"       jsonb NULL,
                "publishedAt" timestamp without time zone NULL,
                "featured"    boolean NOT NULL
            )
            """, ct);

        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS "products" (
                "id"      SERIAL UNIQUE,
                "sku"     varchar NOT NULL UNIQUE,
                "title"   varchar NOT NULL,
                "price"   decimal NOT NULL,
                "stock"   integer NOT NULL,
                "inStock" boolean NOT NULL
            )
            """, ct);

        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS "categories" (
                "id"   SERIAL UNIQUE,
                "name" varchar NOT NULL,
                "slug" varchar NOT NULL UNIQUE
            )
            """, ct);

        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS "events" (
                "id"       SERIAL UNIQUE,
                "title"    varchar NOT NULL,
                "startsAt" timestamp without time zone NOT NULL,
                "venue"    varchar NULL
            )
            """, ct);

        // ── Insert demo entries ───────────────────────────────────────────────

        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO "authors" ("name", "email", "bio") VALUES
                ('Mara Voss',   'mara@dynamo.io',  'Editor at large.'),
                ('Jules Okafor','jules@dynamo.io', 'Writes about systems.'),
                ('Anya Petrov', 'anya@dynamo.io',  'Designer & translator.')
            """, ct);

        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO "articles" ("title", "slug", "author", "publishedAt", "featured") VALUES
                ('The art of slow publishing',      'the-art-of-slow-publishing', '{"dataCollection":"authors","property":"id","value":1}'::jsonb, '2026-03-12 09:00:00', true),
                ('Designing for editorial trust',   'designing-editorial-trust',  '{"dataCollection":"authors","property":"id","value":2}'::jsonb, '2026-03-04 14:30:00', false),
                ('Headless, considered',            'headless-considered',        '{"dataCollection":"authors","property":"id","value":1}'::jsonb, '2026-02-21 08:00:00', true),
                ('A field guide to schemas',        'field-guide-schemas',        '{"dataCollection":"authors","property":"id","value":3}'::jsonb, NULL,                  false),
                ('Locale as a first-class citizen', 'locale-first-class',         '{"dataCollection":"authors","property":"id","value":2}'::jsonb, '2026-01-30 11:00:00', false),
                ('Versioning content that breathes','versioning-content',         '{"dataCollection":"authors","property":"id","value":1}'::jsonb, NULL,                  false),
                ('Notes on a craft tool',           'notes-craft-tool',           '{"dataCollection":"authors","property":"id","value":3}'::jsonb, '2026-01-08 16:20:00', false),
                ('Quiet defaults',                  'quiet-defaults',             '{"dataCollection":"authors","property":"id","value":2}'::jsonb, '2025-12-19 10:00:00', true)
            """, ct);

        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO "products" ("sku", "title", "price", "stock", "inStock") VALUES
                ('BK-001',  'Letterpress Notebook, ruled',  18.00, 42, true),
                ('BK-002',  'Letterpress Notebook, dotted', 18.00, 16, true),
                ('PEN-014', 'Fountain pen, walnut',         64.00,  0, false),
                ('INK-007', 'Iron-gall ink, 30ml',          12.00, 88, true)
            """, ct);

        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO "categories" ("name", "slug") VALUES
                ('Essays', 'essays'),
                ('Notes',  'notes'),
                ('Guides', 'guides')
            """, ct);

        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO "events" ("title", "startsAt", "venue") VALUES
                ('Editorial workshop', '2026-06-04 18:00:00', 'Studio 3, Berlin'),
                ('Type & rhythm',      '2026-07-12 19:00:00', 'Online')
            """, ct);
    }

    // ── Content Versions ──────────────────────────────────────────────────────

    private static async Task SeedContentVersionsAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.ContentVersions.AnyAsync(ct)) return;

        var now = DateTime.UtcNow;

        db.ContentVersions.AddRange(
            new ContentVersion
            {
                CollectionName = "articles", EntryId = 1, VersionNumber = 12,
                ChangeSummary = "Updated cover image and subtitle",
                CreatedAt = now.AddHours(-1), CreatedBy = "1", CreatedByName = "Mara Voss",
                IsCurrent = true,
                Data = new Dictionary<string, object> { ["title"] = "The art of slow publishing" }
            },
            new ContentVersion
            {
                CollectionName = "articles", EntryId = 1, VersionNumber = 11,
                ChangeSummary = "Minor copy edits to opening paragraph",
                CreatedAt = now.AddHours(-3), CreatedBy = "2", CreatedByName = "Jules Okafor",
                IsCurrent = false,
                Data = new Dictionary<string, object> { ["title"] = "The art of slow publishing" }
            },
            new ContentVersion
            {
                CollectionName = "articles", EntryId = 1, VersionNumber = 10,
                ChangeSummary = "Added pull quote, restructured section 2",
                CreatedAt = now.AddDays(-1), CreatedBy = "1", CreatedByName = "Mara Voss",
                IsCurrent = false,
                Data = new Dictionary<string, object> { ["title"] = "The art of slow publishing" }
            },
            new ContentVersion
            {
                CollectionName = "articles", EntryId = 1, VersionNumber = 9,
                ChangeSummary = "Translated body, added locale fr",
                CreatedAt = now.AddDays(-1).AddHours(-4), CreatedBy = "3", CreatedByName = "Anya Petrov",
                IsCurrent = false,
                Data = new Dictionary<string, object> { ["title"] = "The art of slow publishing" }
            },
            new ContentVersion
            {
                CollectionName = "articles", EntryId = 1, VersionNumber = 8,
                ChangeSummary = "Initial draft",
                CreatedAt = now.AddDays(-7), CreatedBy = "1", CreatedByName = "Mara Voss",
                IsCurrent = false,
                Data = new Dictionary<string, object> { ["title"] = "The art of slow publishing" }
            },
            new ContentVersion
            {
                CollectionName = "articles", EntryId = 2, VersionNumber = 1,
                ChangeSummary = "Published v1",
                CreatedAt = now.AddDays(-5), CreatedBy = "2", CreatedByName = "Jules Okafor",
                IsCurrent = true,
                Data = new Dictionary<string, object> { ["title"] = "Designing for editorial trust" }
            }
        );
    }

    // ── Single Types ──────────────────────────────────────────────────────────

    private static async Task SeedSingleTypesAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.SingleTypes.AnyAsync(ct)) return;

        static SingleTypeField F(string name, string apiId, string type, int order, bool required = false) =>
            new() { Name = name, ApiId = apiId, Type = type, DisplayOrder = order, Required = required };

        var homepage = new SingleType { Name = "Homepage", ApiId = "homepage", IsPublished = true };
        homepage.Fields =
        [
            F("Hero Title",       "heroTitle",       "string",    0, required: true),
            F("Hero Subtitle",    "heroSubtitle",    "string",    1),
            F("Hero CTA",         "heroCta",         "string",    2),
            F("Hero Image",       "heroImage",       "file",      3),
            F("Featured Articles","featuredArticles","reference", 4),
            F("Footer Links",     "footerLinks",     "text",      5),
            F("Announcement",     "announcement",    "text",      6),
        ];

        var about = new SingleType { Name = "About", ApiId = "about", IsPublished = true };
        about.Fields =
        [
            F("Headline",      "headline",    "string",   0, required: true),
            F("Body",          "body",        "richtext", 1),
            F("Team Imagery",  "teamImagery", "file",     2),
            F("Contact Email", "contactEmail","string",   3),
            F("Social Links",  "socialLinks", "text",     4),
        ];

        var settings = new SingleType { Name = "Site settings", ApiId = "settings", IsPublished = false };
        settings.Fields =
        [
            F("Site Name",          "siteName",         "string",  0, required: true),
            F("Site Description",   "siteDescription",  "text",    1),
            F("Logo",               "logo",             "file",    2),
            F("Favicon",            "favicon",          "file",    3),
            F("Primary Color",      "primaryColor",     "string",  4),
            F("Secondary Color",    "secondaryColor",   "string",  5),
            F("Google Analytics ID","googleAnalyticsId","string",  6),
            F("Meta Title Suffix",  "metaTitleSuffix",  "string",  7),
            F("Maintenance Mode",   "maintenanceMode",  "boolean", 8),
        ];

        var contact = new SingleType { Name = "Contact", ApiId = "contact", IsPublished = true };
        contact.Fields =
        [
            F("Email",       "email",      "string", 0, required: true),
            F("Phone",       "phone",      "string", 1),
            F("Address",     "address",    "text",   2),
            F("Map Embed URL","mapEmbedUrl","string", 3),
        ];

        db.SingleTypes.AddRange(homepage, about, settings, contact);
        await db.SaveChangesAsync(ct); // resolve IDs before adding data

        // Seed published data snapshots
        static JsonDocument Json(object obj) =>
            JsonDocument.Parse(JsonSerializer.Serialize(obj));

        db.SingleTypeData.AddRange(
            new SingleTypeData
            {
                SingleTypeId = homepage.Id,
                Status = ContentStatus.Published,
                Version = 12,
                Locale = "en",
                PublishedAt = DateTime.UtcNow.AddDays(-30),
                Data = Json(new
                {
                    heroTitle = "The CMS that stays out of your way.",
                    heroSubtitle = "Model your content. Ship your API. Done.",
                    heroCta = "Get started",
                    announcement = "Dynamo v2 is now in public beta."
                })
            },
            new SingleTypeData
            {
                SingleTypeId = about.Id,
                Status = ContentStatus.Published,
                Version = 4,
                Locale = "en",
                PublishedAt = DateTime.UtcNow.AddDays(-60),
                Data = Json(new
                {
                    headline = "Built for editorial teams who think in systems.",
                    contactEmail = "hello@dynamo.io",
                    socialLinks = "https://github.com/dynamo"
                })
            },
            new SingleTypeData
            {
                SingleTypeId = settings.Id,
                Status = ContentStatus.Draft,
                Version = 1,
                Locale = "en",
                Data = Json(new
                {
                    siteName = "Dynamo CMS",
                    siteDescription = "A headless CMS for editorial teams.",
                    primaryColor = "#E85D38",
                    maintenanceMode = false
                })
            },
            new SingleTypeData
            {
                SingleTypeId = contact.Id,
                Status = ContentStatus.Published,
                Version = 2,
                Locale = "en",
                PublishedAt = DateTime.UtcNow.AddDays(-45),
                Data = Json(new
                {
                    email = "hello@dynamo.io",
                    phone = "+1 555 000 1234",
                    address = "Studio 3, Mitte, Berlin, DE 10119"
                })
            }
        );
    }
}
