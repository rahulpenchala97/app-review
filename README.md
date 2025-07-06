# App Review System

A comprehensive full-stack application for mobile app reviews built with Django REST Framework and React TypeScript.

## 🚀 Quick Start (Cross-Platform)

### Prerequisites
- **Docker Desktop** (Required for all platforms)
  - **Windows**: https://www.docker.com/products/docker-desktop/
  - **macOS**: https://www.docker.com/products/docker-desktop/
  - **Linux**: https://docs.docker.com/engine/install/

### Option 1: One-Click Start (Recommended)

#### Windows
```cmd
# Double-click the file or run in Command Prompt
RUN_APPLICATION.bat
```

#### macOS/Linux
```bash
# Make executable and run
chmod +x start.sh
./start.sh

# Or run directly with Docker
docker compose up --build
```

#### Universal (All Platforms)
```bash
# Navigate to project directory
cd app-review

# Start the application (builds automatically)
docker compose up --build
```

### What Happens During Startup
1. **PostgreSQL database** starts with health checks
2. **Django migrations** run automatically
3. **Admin user** created (admin/admin123)
4. **Real Google Play Store data** loaded automatically:
5. **Django server** starts on port 8000
6. **React frontend** starts on port 3000 with hot reload

### Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin
  - Username: `admin`
  - Password: `admin123`

## 🎯 Key Features Demonstrated

### Backend (Django REST Framework)
- ✅ **RESTful API Design** with proper HTTP methods and status codes
- ✅ **JWT Authentication** with token refresh mechanism
- ✅ **Role-based Permissions** (Users vs Supervisors)
- ✅ **Smart Search Algorithm** using `difflib.get_close_matches`
- ✅ **Content Moderation Workflow** with approval/rejection system
- ✅ **Database Design** with optimized indexes and relationships
- ✅ **Input Validation** and comprehensive error handling

### Frontend (React TypeScript)
- ✅ **Modern React Patterns** with hooks and context
- ✅ **TypeScript Implementation** for type safety
- ✅ **Responsive Design** with Tailwind CSS
- ✅ **Real-time Search** with debounced suggestions
- ✅ **State Management** with React Context
- ✅ **API Integration** with automatic token refresh

### DevOps & Architecture
- ✅ **Docker Containerization** with multi-service setup
- ✅ **PostgreSQL Database** with automatic data loading
- ✅ **Hot Reload Development** environment
- ✅ **Cross-platform Compatibility**


```

## 🔧 Alternative Setup (Without Docker)

If you prefer to run locally without Docker:

### Windows
```cmd
# Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py import_csv_data
python manage.py runserver

# Frontend (new terminal)
cd frontend
npm install
npm start
```

### macOS/Linux
```bash
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py import_csv_data
python manage.py runserver

# Frontend (new terminal)
cd frontend
npm install
npm start
```

## 📱 User Journey Demo

1. **Browse Apps**: http://localhost:3000 → See categorized app listings
2. **Search**: Try "WhatsApp" or "photo editor" → Test intelligent search
3. **App Details**: Click any app → View comprehensive information
4. **Register**: Create new account → Test validation and JWT auth
5. **Submit Review**: Write review for any app → Test moderation workflow
6. **Admin Panel**: http://localhost:8000/admin → Moderate reviews
7. **API Testing**: Use curl commands above → Test backend directly

## 🛠️ Development Features

- **Hot Reload**: Changes to React/Django files trigger auto-reload
- **Debug Mode**: Comprehensive logging and error reporting
- **Database Admin**: Full Django admin interface
- **Real Data**: 9,000+ apps for realistic testing
- **Cross-platform**: Works identically on Windows, macOS, Linux

## 📋 Project Architecture

```
app-review/
├── backend/                 # Django REST API
│   ├── apps/               # App management (models, views, serializers)
│   ├── reviews/            # Review system with moderation
│   ├── users/              # User management and profiles
│   ├── *.csv              # Real Google Play Store data
│   └── manage.py          # Django management commands
├── frontend/               # React TypeScript SPA
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── pages/          # Page components (Home, Search, etc.)
│       ├── services/       # API integration layer
│       └── contexts/       # State management (Auth, etc.)
├── docker-compose.yml      # Multi-container orchestration
├── Dockerfile             # Backend container definition
└── RUN_APPLICATION.bat    # One-click Windows launcher
```