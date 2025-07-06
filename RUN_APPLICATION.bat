@echo off
echo ================================================================
echo                  APP REVIEW SYSTEM - INTERVIEW DEMO
echo ================================================================
echo.
echo 🚀 Starting the application...
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Desktop is not running!
    echo    Please start Docker Desktop and try again.
    echo    Download from: https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
)

echo ✅ Docker is running
echo.
echo 🧹 Cleaning up any existing containers...
docker compose down >nul 2>&1

echo 🏗️  Building and starting the application...
echo    (This may take 2-3 minutes on first run)
echo.
docker compose up --build

echo.
echo ================================================================
echo                        🎉 APPLICATION READY!
echo ================================================================
echo.
echo 🌐 Access the application at:
echo    • Frontend:    http://localhost:3000
echo    • Backend API: http://localhost:8000
echo    • Admin Panel: http://localhost:8000/admin
echo.
echo 🔑 Login credentials:
echo    • Admin: admin / admin123
echo.
echo 📊 Features to explore:
echo    • Browse 9,662 real Google Play Store apps
echo    • Search with intelligent suggestions
echo    • Register and submit reviews
echo    • Admin moderation dashboard
echo.
echo 🛑 To stop: Press Ctrl+C, then run: docker compose down
echo.
pause
