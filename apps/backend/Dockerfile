# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy solution and project files
COPY ["src/Dynamo.CMS.API/Dynamo.CMS.API.csproj", "src/Dynamo.CMS.API/"]
RUN dotnet restore "src/Dynamo.CMS.API/Dynamo.CMS.API.csproj"

# Copy all source files
COPY . .

# Build the application
WORKDIR "/src/src/Dynamo.CMS.API"
RUN dotnet build "Dynamo.CMS.API.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "Dynamo.CMS.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# Install wget for health checks
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

# Create directory for file uploads
RUN mkdir -p /app/uploads

# Copy published application
COPY --from=publish /app/publish .

# Expose ports
EXPOSE 80
EXPOSE 443

ENTRYPOINT ["dotnet", "Dynamo.CMS.API.dll"]
