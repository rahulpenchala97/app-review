import difflib
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from app_review_project.pagination import LargeResultsSetPagination
from .models import App
from .serializers import (
    AppListSerializer, AppDetailSerializer, AppCreateSerializer
)


@api_view(['GET'])
@permission_classes([AllowAny])
def app_search_suggestions(request):
    """
    Get app name suggestions after user types 3+ characters.
    Uses icontains for substring matching.
    """
    query = request.GET.get('q', '').strip()
    
    if len(query) < 3:
        return Response({
            'suggestions': [],
            'message': 'Please enter at least 3 characters'
        })
    
    # Search for apps using icontains
    suggestions = App.search_by_name(query, limit=10)
    serializer = AppListSerializer(suggestions, many=True)
    
    return Response({
        'suggestions': serializer.data,
        'query': query,
        'count': len(serializer.data)
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def app_search(request):
    """
    Full app search using difflib for text similarity with pagination.
    Triggered on form submit. Supports category filtering.
    """
    query = request.GET.get('q', '').strip()
    category = request.GET.get('category', '').strip()
    
    # Handle category-only search
    if not query and category:
        apps = App.objects.filter(
            category__iexact=category,
            is_active=True
        ).order_by('-average_rating', 'name')
        
        # Apply pagination
        paginator = LargeResultsSetPagination()
        page = paginator.paginate_queryset(apps, request)

        if page is not None:
            serializer = AppListSerializer(page, many=True)
            response_data = paginator.get_paginated_response(serializer.data)
            # Add metadata
            response_data.data.update({
                'query': query,
                'category': category,
                'search_type': 'category_filter'
            })
            return response_data

        # Fallback
        serializer = AppListSerializer(apps[:50], many=True)
        return Response({
            'results': serializer.data,
            'query': query,
            'category': category,
            'count': len(serializer.data),
            'search_type': 'category_filter'
        })
    
    if not query:
        return Response({
            'results': [],
            'message': 'Please provide a search query'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get all active app names for similarity matching
    all_apps = App.objects.filter(is_active=True)
    
    # Apply category filter if provided
    if category:
        all_apps = all_apps.filter(category__iexact=category)
    
    app_names = all_apps.values_list('name', flat=True)
    
    # Use difflib to find close matches
    close_matches = difflib.get_close_matches(
        query, 
        app_names, 
        n=100,  # Increase for pagination
        cutoff=0.3  # Minimum similarity ratio
    )
    
    # Get app objects for the matched names
    matched_apps = all_apps.filter(name__in=close_matches).order_by('name')
    
    # If no close matches, fall back to icontains search
    if not matched_apps.exists():
        search_filter = Q(name__icontains=query) | Q(developer__icontains=query) | Q(description__icontains=query)
        matched_apps = all_apps.filter(
            search_filter, is_active=True).order_by('-average_rating', 'name')

    # Apply pagination
    paginator = LargeResultsSetPagination()
    page = paginator.paginate_queryset(matched_apps, request)

    if page is not None:
        serializer = AppListSerializer(page, many=True)
        response_data = paginator.get_paginated_response(serializer.data)
        # Add metadata
        response_data.data.update({
            'query': query,
            'category': category,
            'search_type': 'similarity_match' if close_matches else 'fallback_search'
        })
        return response_data
    
    # Fallback
    serializer = AppListSerializer(matched_apps, many=True)
    return Response({
        'results': serializer.data,
        'query': query,
        'category': category,
        'count': len(serializer.data),
        'search_type': 'similarity_match' if close_matches else 'fallback_search'
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def app_detail(request, app_id):
    """
    Get detailed app information including approved reviews.
    """
    try:
        app = App.objects.get(id=app_id, is_active=True)
    except App.DoesNotExist:
        return Response({
            'error': 'App not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    serializer = AppDetailSerializer(app)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def app_list(request):
    """
    Get list of all apps with optional filtering and pagination.
    """
    queryset = App.objects.filter(is_active=True)
    
    # Optional filtering
    category = request.GET.get('category')
    if category:
        queryset = queryset.filter(category__icontains=category)
    
    developer = request.GET.get('developer')
    if developer:
        queryset = queryset.filter(developer__icontains=developer)
    
    # Ordering
    order_by = request.GET.get('order_by', '-created_at')
    valid_order_fields = [
        'name', '-name', 'average_rating', '-average_rating',
        'created_at', '-created_at', 'total_ratings', '-total_ratings'
    ]
    
    if order_by in valid_order_fields:
        queryset = queryset.order_by(order_by)
    else:
        queryset = queryset.order_by('-created_at')
    
    # Apply pagination
    paginator = LargeResultsSetPagination()
    page = paginator.paginate_queryset(queryset, request)
    
    if page is not None:
        serializer = AppListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    # Fallback for when pagination is not applied
    serializer = AppListSerializer(queryset, many=True)
    return Response({
        'results': serializer.data,
        'count': len(serializer.data)
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def app_create(request):
    """
    Create a new app (authenticated users only).
    """
    serializer = AppCreateSerializer(data=request.data)
    
    if serializer.is_valid():
        app = serializer.save()
        detail_serializer = AppDetailSerializer(app)
        return Response(
            detail_serializer.data, 
            status=status.HTTP_201_CREATED
        )
    
    return Response(
        serializer.errors, 
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['GET'])
@permission_classes([AllowAny])
def app_categories(request):
    """
    Get list of all app categories.
    """
    categories = App.objects.filter(
        is_active=True,
        category__isnull=False
    ).values_list('category', flat=True).distinct().order_by('category')
    
    return Response({
        'categories': list(categories)
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def app_developers(request):
    """
    Get list of all developers.
    """
    developers = App.objects.filter(
        is_active=True,
        developer__isnull=False
    ).values_list('developer', flat=True).distinct().order_by('developer')
    
    return Response({
        'developers': list(developers)
    })
