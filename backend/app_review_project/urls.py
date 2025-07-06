"""
URL configuration for app_review_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenVerifyView,
)


def api_home(request):
    """API home endpoint with available endpoints"""
    return JsonResponse({
        'message': 'Welcome to App Review API',
        'version': '1.0',
        'pagination': {
            'note': 'All list endpoints support pagination',
            'parameters': {
                'page': 'Page number (default: 1)',
                'page_size': 'Items per page (default varies by endpoint)',
            },
            'response_format': {
                'links': {'next': 'URL to next page', 'previous': 'URL to previous page'},
                'count': 'Total number of items',
                'total_pages': 'Total number of pages',
                'current_page': 'Current page number',
                'page_size': 'Current page size',
                'results': 'Array of items for current page'
            }
        },
        'endpoints': {
            'authentication': {
                'register': '/api/auth/register/',
                'login': '/api/auth/login/',
                'logout': '/api/auth/logout/',
                'token_refresh': '/api/auth/token/refresh/',
                'token_verify': '/api/auth/token/verify/',
            },
            'apps': {
                'list': '/api/apps/ (paginated)',
                'search': '/api/apps/search/ (paginated)',
                'suggestions': '/api/apps/search/suggestions/',
                'detail': '/api/apps/{id}/',
                'create': '/api/apps/create/',
                'categories': '/api/apps/categories/',
                'developers': '/api/apps/developers/',
            },
            'reviews': {
                'create': '/api/reviews/create/',
                'my_reviews': '/api/reviews/my-reviews/ (paginated)',
                'detail': '/api/reviews/{id}/',
                'pending': '/api/reviews/pending/ (paginated)',
                'moderation': '/api/reviews/moderation/ (paginated)',
                'conflicted': '/api/reviews/conflicted/ (paginated)',
                'moderate': '/api/reviews/{id}/moderate/',
                'supervisor_decision': '/api/reviews/{id}/supervisor-decision/',
                'resolve_conflict': '/api/reviews/{id}/resolve-conflict/',
                'stats': '/api/reviews/stats/',
                'supervisor_stats': '/api/reviews/supervisor-stats/',
            },
            'users': {
                'profile': '/api/users/profile/',
                'update_profile': '/api/users/profile/update/',
                'change_password': '/api/users/change-password/',
                'list': '/api/users/list/ (paginated)',
                'supervisors': '/api/users/supervisors/ (paginated)',
                'promote_supervisor': '/api/users/promote-supervisor/',
                'bulk_promote_supervisors': '/api/users/bulk-promote-supervisors/',
                'revoke_supervisor': '/api/users/{id}/revoke-supervisor/',
            },
        }
    })


urlpatterns = [
    # API home
    path('', api_home, name='api_home'),
    path('api/', api_home, name='api_home_alt'),
    
    # Admin
    path('admin/', admin.site.urls),
    
    # JWT Authentication
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # API endpoints
    path('api/auth/', include(('users.urls', 'auth'), namespace='auth')),
    path('api/apps/', include('apps.urls')),
    path('api/reviews/', include('reviews.urls')),
    path('api/users/', include(('users.urls', 'users'), namespace='users')),
]
