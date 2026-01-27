using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Dynamo.CMS.API.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "dynamo_base_types",
                columns: table => new
                {
                    name = table.Column<string>(type: "text", nullable: false),
                    display_name = table.Column<string>(type: "text", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    db_data_type = table.Column<string>(type: "text", nullable: false),
                    data_type = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dynamo_base_types", x => x.name);
                });

            migrationBuilder.CreateTable(
                name: "dynamo_collections",
                columns: table => new
                {
                    name = table.Column<string>(type: "text", nullable: false),
                    display_name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dynamo_collections", x => x.name);
                });

            migrationBuilder.CreateTable(
                name: "dynamo_roles",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dynamo_roles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "dynamo_users",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FirstName = table.Column<string>(type: "text", nullable: true),
                    LastName = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    UserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: true),
                    SecurityStamp = table.Column<string>(type: "text", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true),
                    PhoneNumber = table.Column<string>(type: "text", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dynamo_users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "dynamo_data_collection_columns",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: false),
                    display_name = table.Column<string>(type: "text", nullable: true),
                    nullable = table.Column<bool>(type: "boolean", nullable: false),
                    visible = table.Column<bool>(type: "boolean", nullable: false),
                    unique = table.Column<bool>(type: "boolean", nullable: false),
                    auto_increment = table.Column<bool>(type: "boolean", nullable: false),
                    data_collection_name = table.Column<string>(type: "text", nullable: false),
                    base_type = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dynamo_data_collection_columns", x => x.id);
                    table.ForeignKey(
                        name: "FK_dynamo_data_collection_columns_dynamo_base_types_base_type",
                        column: x => x.base_type,
                        principalTable: "dynamo_base_types",
                        principalColumn: "name",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_dynamo_data_collection_columns_dynamo_collections_data_coll~",
                        column: x => x.data_collection_name,
                        principalTable: "dynamo_collections",
                        principalColumn: "name",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "dynamo_role_claims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RoleId = table.Column<long>(type: "bigint", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dynamo_role_claims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_dynamo_role_claims_dynamo_roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "dynamo_roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "dynamo_user_claims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dynamo_user_claims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_dynamo_user_claims_dynamo_users_UserId",
                        column: x => x.UserId,
                        principalTable: "dynamo_users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "dynamo_user_logins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    ProviderKey = table.Column<string>(type: "text", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "text", nullable: true),
                    UserId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dynamo_user_logins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_dynamo_user_logins_dynamo_users_UserId",
                        column: x => x.UserId,
                        principalTable: "dynamo_users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "dynamo_user_roles",
                columns: table => new
                {
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    RoleId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dynamo_user_roles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_dynamo_user_roles_dynamo_roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "dynamo_roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_dynamo_user_roles_dynamo_users_UserId",
                        column: x => x.UserId,
                        principalTable: "dynamo_users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "dynamo_user_tokens",
                columns: table => new
                {
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dynamo_user_tokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_dynamo_user_tokens_dynamo_users_UserId",
                        column: x => x.UserId,
                        principalTable: "dynamo_users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_data_collection_columns_base_type",
                table: "dynamo_data_collection_columns",
                column: "base_type");

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_data_collection_columns_data_collection_name",
                table: "dynamo_data_collection_columns",
                column: "data_collection_name");

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_role_claims_RoleId",
                table: "dynamo_role_claims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "dynamo_roles",
                column: "NormalizedName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_user_claims_UserId",
                table: "dynamo_user_claims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_user_logins_UserId",
                table: "dynamo_user_logins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_dynamo_user_roles_RoleId",
                table: "dynamo_user_roles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "dynamo_users",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "dynamo_users",
                column: "NormalizedUserName",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "dynamo_data_collection_columns");

            migrationBuilder.DropTable(
                name: "dynamo_role_claims");

            migrationBuilder.DropTable(
                name: "dynamo_user_claims");

            migrationBuilder.DropTable(
                name: "dynamo_user_logins");

            migrationBuilder.DropTable(
                name: "dynamo_user_roles");

            migrationBuilder.DropTable(
                name: "dynamo_user_tokens");

            migrationBuilder.DropTable(
                name: "dynamo_base_types");

            migrationBuilder.DropTable(
                name: "dynamo_collections");

            migrationBuilder.DropTable(
                name: "dynamo_roles");

            migrationBuilder.DropTable(
                name: "dynamo_users");
        }
    }
}
