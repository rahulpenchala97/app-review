# App Review Platform

> **Full-stack app review system with multi-supervisor moderation workflow**

A production-ready application demonstrating modern web development practices with Django REST Framework backend and React TypeScript frontend.

## Quick Deployment

**Prerequisites**: Docker Desktop installed

```bash
# Clone and start
git clone <repository-url>
cd app-review
docker compose up --build
```

**Access Points**:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000/api
- **Admin**: http://localhost:8000/admin (admin/admin123)

**Default User Credentials**:
| Role | Username | Password | Description |
|------|----------|----------|-------------|
| **Admin** | `admin` | `admin123` | Full system access, can override any review |
| **Supervisor** | `sup1` | `admin123` | Can moderate and vote on reviews |
| **Supervisor** | `sup2` | `admin123` | Additional supervisor for testing workflow |
| **Supervisor** | `sup3` | `admin123` | Third supervisor for testing workflow |
| **User** | `user1` | `admin123` | Regular user, can submit and view reviews |
| **User** | `user2` | `admin123` | Additional user for testing interactions |
| **User** | `user3-user10` | `admin123` | More test users (user3, user4, ..., user10) |

*💡 **Note**: These are default credentials for development/demo purposes. All users use the same password `admin123`. In production, ensure strong passwords and proper user management.*

*Startup time: ~2 minutes (includes database setup and data loading)*

---

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │ ── │  Django API     │ ── │  PostgreSQL     │
│   (Frontend)    │    │   (Backend)     │    │  (Database)     │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📂 Project Structure

```
app-review/
├── backend/                    # Django REST Framework
│   ├── app_review_project/     # Core settings & config
│   ├── apps/                   # App management module
│   ├── reviews/                # Review & moderation system
│   ├── users/                  # Authentication & permissions
│   └── requirements.txt
├── frontend/                   # React TypeScript
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Route components
│   │   ├── services/           # API integration
│   │   └── contexts/           # State management
│   └── package.json
├── docker-compose.yml          # Multi-container setup
└── README.md
```

## ✨ Key Features

### **Backend (Django REST)**
- JWT Authentication with token refresh
- Role-based permissions (User/Supervisor/Admin)
- Multi-supervisor review moderation workflow
- Admin override capabilities
- Smart search with fuzzy matching
- Comprehensive API documentation

### **Frontend (React TypeScript)**
- Modern React hooks & TypeScript
- Responsive design with Tailwind CSS
- Real-time search with debouncing
- Protected routes & state management
- Toast notifications & loading states

### **DevOps & Infrastructure**
- Docker containerization
- Automated database migrations
- Health checks & service dependencies
- Hot reload development environment
- Cross-platform compatibility

## � User Roles & Permissions

| Role | Capabilities |
|------|-------------|
| **User** | Browse apps, submit reviews, view own reviews |
| **Supervisor** | All user permissions + moderate reviews via voting |
| **Admin** | All permissions + override any review status |

## 📊 Demo Data

- **9,000+ real apps** from Google Play Store
- **Categories**: Productivity, Social, Games, etc.
- **Pre-configured users** for testing different roles
- **Sample reviews** demonstrating moderation workflow

## 🛠️ Development

### Local Development (without Docker)
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend (new terminal)
cd frontend
npm install
npm start
```

### API Testing
```bash
# Health check
curl http://localhost:8000/api/health/

# Get apps
curl http://localhost:8000/api/apps/

# Authentication required endpoints
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/reviews/
```

## � Technical Highlights

- **Security**: JWT authentication, CORS configuration, input validation
- **Performance**: Database indexing, pagination, lazy loading
- **Scalability**: Modular architecture, containerized deployment
- **Code Quality**: TypeScript, ESLint, comprehensive error handling
- **Testing**: API endpoints testable via admin interface

---
