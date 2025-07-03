# App Review System

A comprehensive Django REST API application for mobile app reviews with JWT authentication, search functionality, and supervisor approval workflow.

## Features

### 🔍 **Search Functionality**
- **Auto-suggestions**: Type 3+ characters to get app name suggestions using `icontains`
- **Full Search**: Submit search to get results based on text similarity using `difflib.get_close_matches`
- **Fallback Search**: Falls back to `icontains` search across name, developer, and description

### 📱 **App Management**
- Complete CRUD operations for mobile apps
- Rich metadata support (developer, category, ratings, etc.)
- Extensible design with JSON fields for future features
- App categorization and developer filtering

### ⭐ **Review System**
- Authenticated users can submit reviews
- One review per user per app
- Reviews start with "pending" status
- Star ratings (1-5) with optional title and content
- Extensible design for future features (sentiment analysis, helpful votes)

### 👨‍💼 **Supervisor Approval Workflow**
- Users in "supervisors" group can moderate reviews
- Approve or reject pending reviews with reasons
- Automatic rating updates when reviews are approved
- Comprehensive moderation statistics

### 🔐 **JWT Authentication**
- User registration and login
- JWT access and refresh tokens
- Profile management with extensible user profiles
- Password change functionality

### 🐳 **Docker Support**
- Complete Docker setup with PostgreSQL
- Development-ready docker-compose configuration
- Automated database setup and migrations

## Quick Start

### Prerequisites
- Python 3.10+
- PostgreSQL (for production) or use Docker
- Git

### Development Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd app-review
```

2. **Set up virtual environment**
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your settings
```

5. **Run migrations and setup data**
```bash
python manage.py migrate
python manage.py setup_data
```

6. **Start development server**
```bash
python manage.py runserver
```

### Docker Setup

1. **Build and run with Docker Compose**
```bash
docker-compose up --build
```

2. **The application will be available at:**
- API: http://localhost:8000
- Admin: http://localhost:8000/admin

3. **Default credentials:**
- Username: `admin`
- Password: `admin123`

## API Documentation

### Base URL
```
http://localhost:8000/api/
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register/
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "password_confirm": "password123",
  "first_name": "Test",
  "last_name": "User"
}
```

#### Login
```http
POST /api/auth/login/
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123"
}
```

#### Refresh Token
```http
POST /api/auth/token/refresh/
Content-Type: application/json

{
  "refresh": "your-refresh-token"
}
```

### App Endpoints

#### Search Suggestions (3+ characters)
```http
GET /api/apps/search/suggestions/?q=whats
```

#### Full Search
```http
GET /api/apps/search/?q=messaging app
```

#### List Apps
```http
GET /api/apps/
GET /api/apps/?category=Communication
GET /api/apps/?developer=Meta
GET /api/apps/?order_by=-average_rating
```

#### App Detail
```http
GET /api/apps/1/
```

#### Create App (Authenticated)
```http
POST /api/apps/create/
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "name": "My Awesome App",
  "description": "An amazing mobile application",
  "developer": "My Company",
  "category": "Productivity",
  "tags": ["productivity", "utility"]
}
```

### Review Endpoints

#### Submit Review (Authenticated)
```http
POST /api/reviews/create/
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "app": 1,
  "title": "Great app!",
  "content": "I really love this application. It's very user-friendly.",
  "rating": 5,
  "tags": ["excellent", "user-friendly"]
}
```

#### Get My Reviews
```http
GET /api/reviews/my-reviews/
Authorization: Bearer your-access-token
```

#### Update Review (Pending only)
```http
PUT /api/reviews/1/
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "title": "Updated review title",
  "content": "Updated review content",
  "rating": 4
}
```

### Supervisor Endpoints

#### Get Pending Reviews (Supervisors only)
```http
GET /api/reviews/pending/
Authorization: Bearer supervisor-access-token
```

#### Approve Review
```http
POST /api/reviews/1/moderate/
Authorization: Bearer supervisor-access-token
Content-Type: application/json

{
  "action": "approve"
}
```

#### Reject Review
```http
POST /api/reviews/1/moderate/
Authorization: Bearer supervisor-access-token
Content-Type: application/json

{
  "action": "reject",
  "rejection_reason": "Inappropriate content"
}
```

### User Profile Endpoints

#### Get Profile
```http
GET /api/users/profile/
Authorization: Bearer your-access-token
```

#### Update Profile
```http
PUT /api/users/profile/update/
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "first_name": "Updated",
  "last_name": "Name",
  "bio": "Updated bio",
  "location": "New York"
}
```

## Architecture

### Project Structure
```
app-review/
├── app_review_project/     # Main Django project
├── apps/                   # App management module
├── reviews/               # Review management module
├── users/                 # User management module
├── fixtures/              # Sample data
├── requirements.txt       # Python dependencies
├── docker-compose.yml     # Docker configuration
├── Dockerfile            # Docker image definition
└── manage.py             # Django management script
```

### Database Models

#### App Model
- Comprehensive app metadata
- JSON fields for extensibility
- Rating calculations
- Search optimization

#### Review Model
- User-app relationship
- Moderation workflow
- Extensible for sentiment analysis
- Helpful votes support

#### UserProfile Model
- Extended user information
- Reputation system ready
- Preference management
- Statistics tracking

## Extensibility Features

### Current Extensible Fields

1. **App Model**
   - `tags`: JSON field for categorization
   - `metadata`: JSON field for additional data

2. **Review Model**
   - `sentiment_score`: For AI sentiment analysis
   - `helpful_votes`: For community moderation
   - `tags`: For review categorization
   - `metadata`: For additional data

3. **UserProfile Model**
   - `preferences`: User preference storage
   - `metadata`: Additional user data
   - `reputation_score`: Gamification ready

### Future Enhancement Ideas

1. **NLP Integration**
   - Sentiment analysis for reviews
   - Automatic tagging
   - Content moderation

2. **Recommendation System**
   - App recommendations based on reviews
   - User preference learning
   - Collaborative filtering

3. **Advanced Moderation**
   - Machine learning for spam detection
   - Community moderation features
   - Automated quality scoring

4. **Gamification**
   - User reputation system
   - Badges and achievements
   - Leaderboards

## Testing

### Run Tests
```bash
python manage.py test
```

### API Testing with curl

#### Test App Search
```bash
# Get suggestions
curl "http://localhost:8000/api/apps/search/suggestions/?q=wha"

# Full search
curl "http://localhost:8000/api/apps/search/?q=messaging"
```

#### Test Authentication
```bash
# Register user
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "email": "test@example.com", "password": "password123", "password_confirm": "password123"}'

# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "password123"}'
```

## Production Deployment

### Environment Variables
```bash
SECRET_KEY=your-secret-key
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=your_db_host
DB_PORT=5432
```

### PostgreSQL Setup
```sql
CREATE DATABASE app_review_db;
CREATE USER app_review_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE app_review_db TO app_review_user;
```

### Static Files
```bash
python manage.py collectstatic
```

### Gunicorn
```bash
gunicorn app_review_project.wsgi:application --bind 0.0.0.0:8000
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Review the API documentation above
- Check the Django admin interface for data management

## Development Notes

### Key Design Decisions

1. **Function-Based Views**: Used FBVs as requested for better control and simplicity
2. **Modular Architecture**: Separated concerns into distinct Django apps
3. **JWT Authentication**: Industry-standard token-based authentication
4. **PostgreSQL**: Production-ready database with JSON field support
5. **Extensible Models**: JSON fields for future feature additions
6. **Docker Support**: Complete containerization for easy deployment

### Search Implementation

The search functionality uses a two-tier approach:
1. **Auto-suggestions**: Fast `icontains` lookup for real-time suggestions
2. **Full search**: `difflib.get_close_matches` for similarity-based matching with fallback to broader search

This provides both speed and accuracy for different user interaction patterns.
