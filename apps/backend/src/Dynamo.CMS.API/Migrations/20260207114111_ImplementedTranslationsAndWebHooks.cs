using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Dynamo.CMS.API.Migrations
{
    /// <inheritdoc />
    public partial class ImplementedTranslationsAndWebHooks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "alt_text",
                table: "uploaded_files",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "focal_point_x",
                table: "uploaded_files",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "focal_point_y",
                table: "uploaded_files",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "folder_id",
                table: "uploaded_files",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<Dictionary<string, object>>(
                name: "metadata",
                table: "uploaded_files",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<List<string>>(
                name: "tags",
                table: "uploaded_files",
                type: "text[]",
                nullable: true);

            migrationBuilder.AddColumn<Dictionary<string, object>>(
                name: "transformations",
                table: "uploaded_files",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<List<string>>(
                name: "available_locales",
                table: "dynamo_collections",
                type: "text[]",
                nullable: false);

            migrationBuilder.AddColumn<string>(
                name: "default_locale",
                table: "dynamo_collections",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "enable_i18n",
                table: "dynamo_collections",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<List<string>>(
                name: "translatable_fields",
                table: "dynamo_collections",
                type: "text[]",
                nullable: false);

            migrationBuilder.CreateTable(
                name: "dynamo_components",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false, defaultValue: "Content"),
                    Icon = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Schema = table.Column<Dictionary<string, object>>(type: "jsonb", nullable: false),
                    DefaultData = table.Column<Dictionary<string, object>>(type: "jsonb", nullable: true),
                    ValidationRules = table.Column<Dictionary<string, object>>(type: "jsonb", nullable: true),
                    IsSystem = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    AllowMultiple = table.Column<bool>(type: "boolean", nullable: false),
                    MaxInstances = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dynamo_components", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "dynamo_content_versions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CollectionName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    EntryId = table.Column<int>(type: "integer", nullable: false),
                    VersionNumber = table.Column<int>(type: "integer", nullable: false),
                    Data = table.Column<Dictionary<string, object>>(type: "jsonb", nullable: false),
                    ChangeSummary = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    CreatedByName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    IsCurrent = table.Column<bool>(type: "boolean", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dynamo_content_versions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "dynamo_locales",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    NativeName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsRtl = table.Column<bool>(type: "boolean", nullable: false),
                    FlagEmoji = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dynamo_locales", x => x.Id);
                    table.UniqueConstraint("AK_dynamo_locales_Code", x => x.Code);
                });

            migrationBuilder.CreateTable(
                name: "dynamo_media_folders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ParentId = table.Column<int>(type: "integer", nullable: true),
                    Path = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dynamo_media_folders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_dynamo_media_folders_dynamo_media_folders_ParentId",
                        column: x => x.ParentId,
                        principalTable: "dynamo_media_folders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "dynamo_media_transformations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FileId = table.Column<long>(type: "bigint", nullable: false),
                    TransformationKey = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    FilePath = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    FileSize = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dynamo_media_transformations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_dynamo_media_transformations_uploaded_files_FileId",
                        column: x => x.FileId,
                        principalTable: "uploaded_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "dynamo_scheduled_jobs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    JobType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CollectionName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    EntryId = table.Column<int>(type: "integer", nullable: false),
                    ScheduledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsCompleted = table.Column<bool>(type: "boolean", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dynamo_scheduled_jobs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "dynamo_webhooks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    HttpMethod = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Events = table.Column<List<string>>(type: "jsonb", nullable: false),
                    Headers = table.Column<Dictionary<string, string>>(type: "jsonb", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SecretKey = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    TimeoutSeconds = table.Column<int>(type: "integer", nullable: false),
                    MaxRetries = table.Column<int>(type: "integer", nullable: false),
                    RetryDelaySeconds = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastTriggeredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SuccessCount = table.Column<int>(type: "integer", nullable: false),
                    FailureCount = table.Column<int>(type: "integer", nullable: false),
                    LastError = table.Column<string>(type: "text", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dynamo_webhooks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "dynamo_content_translations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CollectionName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    EntryId = table.Column<int>(type: "integer", nullable: false),
                    LocaleCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    TranslatedFields = table.Column<Dictionary<string, object>>(type: "jsonb", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true),
                    IsComplete = table.Column<bool>(type: "boolean", nullable: false),
                    CompletionPercentage = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dynamo_content_translations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_dynamo_content_translations_dynamo_locales_LocaleCode",
                        column: x => x.LocaleCode,
                        principalTable: "dynamo_locales",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "dynamo_webhook_deliveries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WebhookId = table.Column<int>(type: "integer", nullable: false),
                    EventName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Payload = table.Column<Dictionary<string, object>>(type: "jsonb", nullable: false),
                    StatusCode = table.Column<int>(type: "integer", nullable: true),
                    Response = table.Column<string>(type: "text", nullable: true),
                    ResponseHeaders = table.Column<Dictionary<string, string>>(type: "jsonb", nullable: true),
                    IsSuccess = table.Column<bool>(type: "boolean", nullable: false),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DurationMs = table.Column<int>(type: "integer", nullable: false),
                    RetryCount = table.Column<int>(type: "integer", nullable: false),
                    NextRetryAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dynamo_webhook_deliveries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_dynamo_webhook_deliveries_dynamo_webhooks_WebhookId",
                        column: x => x.WebhookId,
                        principalTable: "dynamo_webhooks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_uploaded_files_folder_id",
                table: "uploaded_files",
                column: "folder_id");

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_components_Name",
                table: "dynamo_components",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_content_translations_CollectionName_EntryId_LocaleCo~",
                table: "dynamo_content_translations",
                columns: new[] { "CollectionName", "EntryId", "LocaleCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_content_translations_LocaleCode",
                table: "dynamo_content_translations",
                column: "LocaleCode");

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_content_versions_CollectionName_EntryId",
                table: "dynamo_content_versions",
                columns: new[] { "CollectionName", "EntryId" });

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_content_versions_IsCurrent_IsDeleted",
                table: "dynamo_content_versions",
                columns: new[] { "IsCurrent", "IsDeleted" });

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_locales_Code",
                table: "dynamo_locales",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_media_folders_ParentId",
                table: "dynamo_media_folders",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_media_transformations_FileId_TransformationKey",
                table: "dynamo_media_transformations",
                columns: new[] { "FileId", "TransformationKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_scheduled_jobs_CollectionName_EntryId",
                table: "dynamo_scheduled_jobs",
                columns: new[] { "CollectionName", "EntryId" });

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_scheduled_jobs_IsCompleted_ScheduledAt",
                table: "dynamo_scheduled_jobs",
                columns: new[] { "IsCompleted", "ScheduledAt" });

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_webhook_deliveries_IsSuccess_NextRetryAt",
                table: "dynamo_webhook_deliveries",
                columns: new[] { "IsSuccess", "NextRetryAt" });

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_webhook_deliveries_SentAt",
                table: "dynamo_webhook_deliveries",
                column: "SentAt");

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_webhook_deliveries_WebhookId",
                table: "dynamo_webhook_deliveries",
                column: "WebhookId");

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_webhooks_IsActive",
                table: "dynamo_webhooks",
                column: "IsActive");

            migrationBuilder.AddForeignKey(
                name: "FK_uploaded_files_dynamo_media_folders_folder_id",
                table: "uploaded_files",
                column: "folder_id",
                principalTable: "dynamo_media_folders",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_uploaded_files_dynamo_media_folders_folder_id",
                table: "uploaded_files");

            migrationBuilder.DropTable(
                name: "dynamo_components");

            migrationBuilder.DropTable(
                name: "dynamo_content_translations");

            migrationBuilder.DropTable(
                name: "dynamo_content_versions");

            migrationBuilder.DropTable(
                name: "dynamo_media_folders");

            migrationBuilder.DropTable(
                name: "dynamo_media_transformations");

            migrationBuilder.DropTable(
                name: "dynamo_scheduled_jobs");

            migrationBuilder.DropTable(
                name: "dynamo_webhook_deliveries");

            migrationBuilder.DropTable(
                name: "dynamo_locales");

            migrationBuilder.DropTable(
                name: "dynamo_webhooks");

            migrationBuilder.DropIndex(
                name: "IX_uploaded_files_folder_id",
                table: "uploaded_files");

            migrationBuilder.DropColumn(
                name: "alt_text",
                table: "uploaded_files");

            migrationBuilder.DropColumn(
                name: "focal_point_x",
                table: "uploaded_files");

            migrationBuilder.DropColumn(
                name: "focal_point_y",
                table: "uploaded_files");

            migrationBuilder.DropColumn(
                name: "folder_id",
                table: "uploaded_files");

            migrationBuilder.DropColumn(
                name: "metadata",
                table: "uploaded_files");

            migrationBuilder.DropColumn(
                name: "tags",
                table: "uploaded_files");

            migrationBuilder.DropColumn(
                name: "transformations",
                table: "uploaded_files");

            migrationBuilder.DropColumn(
                name: "available_locales",
                table: "dynamo_collections");

            migrationBuilder.DropColumn(
                name: "default_locale",
                table: "dynamo_collections");

            migrationBuilder.DropColumn(
                name: "enable_i18n",
                table: "dynamo_collections");

            migrationBuilder.DropColumn(
                name: "translatable_fields",
                table: "dynamo_collections");
        }
    }
}
