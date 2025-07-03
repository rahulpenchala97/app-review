# App Review System

A comprehensive full-stack application for mobile app reviews with Django REST Framework backend and React TypeScript frontend.

## 🚀 Features

### Backend (Django REST API)
- **🔍 Smart Search**: Auto-suggestions and full-text search with `difflib.get_close_matches`
- **📱 App Management**: Complete CRUD operations with rich metadata
- **⭐ Review System**: User reviews with ratings, moderation workflow
- **👨‍💼 Supervisor Approval**: Role-based review moderation
- **🔐 JWT Authentication**: Secure user authentication and authorization
- **🐳 Docker Support**: Complete containerized deployment

### Frontend (React TypeScript)
- **🎨 Modern UI**: Clean, responsive design with Tailwind CSS
- **🔍 Real-time Search**: Live suggestions and advanced filtering
- **📊 User Dashboard**: Personal review management and statistics
- **👮 Moderation Interface**: Supervisor tools for content review
- **📱 Mobile-first**: Responsive design for all devices
- **⚡ Fast Navigation**: Client-side routing with React Router

## 🏗️ Architecture

```
app-review/
├── backend/                 # Django REST API
│   ├── app_review_project/ # Project settings
│   ├── apps/               # App management
│   ├── reviews/            # Review system
│   ├── users/              # User management
│   └── manage.py
├── frontend/               # React TypeScript app
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── contexts/       # React contexts
│   └── package.json
├── docker-compose.yml      # Multi-container setup
├── Dockerfile             # Backend container
├── setup-backend.sh       # Backend setup script
└── setup-frontend.sh      # Frontend setup script
```

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

1. **Clone and setup backend:**
   ```bash
   git clone <repository-url>
   cd app-review
   ./setup-backend.sh
   ```

2. **Setup frontend (in new terminal):**
   ```bash
   ./setup-frontend.sh
   ```

3. **Start development servers:**
   ```bash
   # Terminal 1 - Backend
   cd backend && source ../venv/bin/activate && python manage.py runserver
   
   # Terminal 2 - Frontend  
   cd frontend && npm start
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Admin Panel: http://localhost:8000/admin (admin/admin123)

5. **Import CSV data (optional - already includes full dataset):**
   ```bash
   # The system comes with 9,662 apps and 7,591 reviews pre-imported
   # To re-import or update data:
   cd backend
   python manage.py import_csv_data --clear-existing
   ```

### Option 2: Docker Setup (Full Stack)

```bash
# Build and run all services (backend, frontend, database)
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

**Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Admin Panel: http://localhost:8000/admin (admin/admin123)
- Database: PostgreSQL on port 5432

### Option 3: Production Deployment

```bash
# Copy production environment file
cp .env.prod.example .env.prod

# Edit environment variables
nano .env.prod

# Deploy with production configuration
docker-compose -f docker-compose.prod.yml up -d --build
```

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login  
- `POST /api/auth/refresh/` - Token refresh
- `POST /api/auth/logout/` - User logout

### Apps
- `GET /api/apps/` - List all apps
- `GET /api/apps/{id}/` - App details with reviews
- `GET /api/apps/search/?q=<query>` - Search apps
- `GET /api/apps/search/suggestions/?q=<query>` - Search suggestions
- `GET /api/apps/categories/` - List categories

### Reviews  
- `POST /api/reviews/create/` - Create review
- `GET /api/reviews/my-reviews/` - User's reviews
- `GET /api/reviews/pending/` - Pending reviews (supervisors)
- `PUT /api/reviews/{id}/moderate/` - Moderate review
- `GET /api/reviews/stats/` - Review statistics

### Users
- `GET /api/users/profile/` - User profile

## 📊 CSV Data Import

The system supports importing real Google Play Store data from CSV files:

```bash
# Import Google Play Store apps and reviews
python manage.py import_csv_data

# Import with options
python manage.py import_csv_data --clear-existing --limit 1000
```

**Imported Dataset:**
- **9,662 apps** across 36 categories (Family, Games, Tools, Business, Medical, etc.)
- **7,591 reviews** with sentiment analysis and ratings
- **Real Google Play Store data** with metadata, ratings, and user feedback
- **Smart data processing** (size parsing, date conversion, sentiment mapping)
- **Duplicate handling** and error recovery

**Top Categories:**
- Family: 1,906 apps
- Games: 926 apps  
- Tools: 829 apps
- Business: 419 apps
- Medical: 396 apps

**Rating Distribution:**
- ⭐ (1): 196 reviews
- ⭐⭐ (2): 1,491 reviews
- ⭐⭐⭐ (3): 926 reviews
- ⭐⭐⭐⭐ (4): 3,890 reviews
- ⭐⭐⭐⭐⭐ (5): 1,088 reviews

See `backend/CSV_IMPORT_GUIDE.md` for detailed instructions.

## 🛠️ Technology Stack

### Backend
- **Django 4.2** + **Django REST Framework**
- **SimpleJWT** for authentication
- **PostgreSQL** (Docker) / **SQLite** (Development)
- **CORS Headers** for cross-origin requests

### Frontend  
- **React 19** + **TypeScript**
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API calls
- **React Hot Toast** for notifications

### DevOps
- **Docker** + **Docker Compose** (Full stack deployment)
- **PostgreSQL** database
- **CORS** configuration
- **Multi-stage builds** for production optimization
