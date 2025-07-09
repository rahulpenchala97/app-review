"""
Middleware to add additional security checks for review system operations.
"""
import logging
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.core.cache import cache
from django.contrib.auth.models import User

logger = logging.getLogger(__name__)


class ReviewSecurityMiddleware(MiddlewareMixin):
    """
    Middleware to add additional security checks for review operations.
    """
    
    SUPERVISOR_ENDPOINTS = [
        '/api/reviews/pending/',
        '/api/reviews/moderation/',
        '/api/reviews/supervisor-stats/',
    ]
    
    SUPERUSER_ENDPOINTS = [
        '/api/reviews/conflicted/',
        '/api/reviews/admin-override/',
    ]

    def process_request(self, request):
        """
        Process request to add security checks.
        """
        # Skip for non-authenticated requests
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return None

        path = request.path_info
        
        # Check supervisor endpoints
        if any(path.startswith(endpoint) for endpoint in self.SUPERVISOR_ENDPOINTS):
            if not self._is_valid_supervisor(request.user):
                logger.warning(
                    f"Invalid supervisor access attempt: {request.user.username} -> {path}"
                )
                return JsonResponse({
                    'error': 'Access denied. Valid supervisor privileges required.'
                }, status=403)

        # Check superuser endpoints
        if any(path.startswith(endpoint) for endpoint in self.SUPERUSER_ENDPOINTS):
            if not self._is_valid_superuser(request.user):
                logger.warning(
                    f"Invalid superuser access attempt: {request.user.username} -> {path}"
                )
                return JsonResponse({
                    'error': 'Access denied. Valid superuser privileges required.'
                }, status=403)

        # Check for review moderation endpoints (dynamic IDs)
        if '/moderate/' in path or '/supervisor-decision/' in path:
            if not self._is_valid_supervisor(request.user):
                logger.warning(
                    f"Invalid supervisor moderation attempt: {request.user.username} -> {path}"
                )
                return JsonResponse({
                    'error': 'Access denied. Valid supervisor privileges required.'
                }, status=403)

        # Check for conflict resolution endpoints (dynamic IDs)
        if '/resolve-conflict/' in path:
            if not self._is_valid_superuser(request.user):
                logger.warning(
                    f"Invalid conflict resolution attempt: {request.user.username} -> {path}"
                )
                return JsonResponse({
                    'error': 'Access denied. Valid superuser privileges required.'
                }, status=403)

        return None

    def _is_valid_supervisor(self, user):
        """
        Check if user is a valid supervisor with caching.
        """
        if not user.is_active:
            return False
        
        # Use cache to avoid repeated database queries
        cache_key = f"supervisor_check_{user.id}_{user.password[:10]}"
        is_supervisor = cache.get(cache_key)
        
        if is_supervisor is None:
            # Refresh user from database to get latest group memberships
            try:
                fresh_user = User.objects.prefetch_related('groups').get(id=user.id)
                is_supervisor = (
                    fresh_user.is_active and 
                    fresh_user.groups.filter(name='supervisors').exists()
                )
                # Cache for 5 minutes
                cache.set(cache_key, is_supervisor, 300)
            except User.DoesNotExist:
                return False
        
        return is_supervisor

    def _is_valid_superuser(self, user):
        """
        Check if user is a valid superuser with caching.
        """
        if not user.is_active:
            return False
        
        # Use cache to avoid repeated database queries
        cache_key = f"superuser_check_{user.id}_{user.password[:10]}"
        is_superuser = cache.get(cache_key)
        
        if is_superuser is None:
            # Refresh user from database to get latest permissions
            try:
                fresh_user = User.objects.get(id=user.id)
                is_superuser = fresh_user.is_active and fresh_user.is_superuser
                # Cache for 5 minutes
                cache.set(cache_key, is_superuser, 300)
            except User.DoesNotExist:
                return False
        
        return is_superuser

    def process_exception(self, request, exception):
        """
        Log security-related exceptions.
        """
        if hasattr(request, 'user') and request.user.is_authenticated:
            logger.error(
                f"Exception for user {request.user.username} on {request.path_info}: {exception}"
            )
        return None

class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log each request's method, path, user, and response status code.
    """
    def process_request(self, request):
        user = getattr(request, 'user', None)
        username = user.username if user and user.is_authenticated else 'Anonymous'
        logger.info(f"Request: {request.method} {request.path} by {username}")
        # No response returned here; continue processing
        return None

    def process_response(self, request, response):
        user = getattr(request, 'user', None)
        username = user.username if user and user.is_authenticated else 'Anonymous'
        logger.info(f"Response: {request.method} {request.path} by {username} - Status {response.status_code}")
        return response
