using System;
using System.Text.Json;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Dynamo.CMS.API.Migrations
{
    /// <inheritdoc />
    public partial class AddedSingleTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "dynamo_single_types",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    api_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    is_published = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<long>(type: "bigint", nullable: true),
                    updated_by = table.Column<long>(type: "bigint", nullable: true),
                    plugin = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dynamo_single_types", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "dynamo_single_type_data",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    single_type_id = table.Column<int>(type: "integer", nullable: false),
                    singleton_key = table.Column<int>(type: "integer", nullable: false),
                    data = table.Column<JsonDocument>(type: "jsonb", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    version = table.Column<int>(type: "integer", nullable: false),
                    published_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    locale = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "en"),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<long>(type: "bigint", nullable: true),
                    updated_by = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dynamo_single_type_data", x => x.id);
                    table.ForeignKey(
                        name: "FK_dynamo_single_type_data_dynamo_single_types_single_type_id",
                        column: x => x.single_type_id,
                        principalTable: "dynamo_single_types",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "dynamo_single_type_fields",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    single_type_id = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    api_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    required = table.Column<bool>(type: "boolean", nullable: false),
                    unique_constraint = table.Column<bool>(type: "boolean", nullable: false),
                    default_value = table.Column<string>(type: "text", nullable: true),
                    validation_regex = table.Column<string>(type: "text", nullable: true),
                    max_length = table.Column<int>(type: "integer", nullable: true),
                    min_length = table.Column<int>(type: "integer", nullable: true),
                    max_value = table.Column<int>(type: "integer", nullable: true),
                    min_value = table.Column<int>(type: "integer", nullable: true),
                    precision = table.Column<int>(type: "integer", nullable: true),
                    scale = table.Column<int>(type: "integer", nullable: true),
                    related_collection_id = table.Column<int>(type: "integer", nullable: true),
                    related_collection_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    relation_type = table.Column<int>(type: "integer", nullable: true),
                    placeholder = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    hidden = table.Column<bool>(type: "boolean", nullable: false),
                    display_order = table.Column<int>(type: "integer", nullable: false),
                    custom_properties = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dynamo_single_type_fields", x => x.id);
                    table.ForeignKey(
                        name: "FK_dynamo_single_type_fields_dynamo_single_types_single_type_id",
                        column: x => x.single_type_id,
                        principalTable: "dynamo_single_types",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "dynamo_field_options",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    field_id = table.Column<int>(type: "integer", nullable: false),
                    label = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    value = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    display_order = table.Column<int>(type: "integer", nullable: false),
                    SingleTypeFieldId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dynamo_field_options", x => x.id);
                    table.ForeignKey(
                        name: "FK_dynamo_field_options_dynamo_single_type_fields_SingleTypeFi~",
                        column: x => x.SingleTypeFieldId,
                        principalTable: "dynamo_single_type_fields",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_field_options_SingleTypeFieldId",
                table: "dynamo_field_options",
                column: "SingleTypeFieldId");

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_single_type_data_single_type_id_locale",
                table: "dynamo_single_type_data",
                columns: new[] { "single_type_id", "locale" });

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_single_type_data_single_type_id_singleton_key_locale",
                table: "dynamo_single_type_data",
                columns: new[] { "single_type_id", "singleton_key", "locale" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_single_type_data_status",
                table: "dynamo_single_type_data",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_single_type_fields_single_type_id_api_id",
                table: "dynamo_single_type_fields",
                columns: new[] { "single_type_id", "api_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_single_types_api_id",
                table: "dynamo_single_types",
                column: "api_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "dynamo_field_options");

            migrationBuilder.DropTable(
                name: "dynamo_single_type_data");

            migrationBuilder.DropTable(
                name: "dynamo_single_type_fields");

            migrationBuilder.DropTable(
                name: "dynamo_single_types");
        }
    }
}
