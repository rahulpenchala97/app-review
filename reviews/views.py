from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import Group
from .models import Review
from .serializers import (
    ReviewListSerializer, ReviewDetailSerializer, ReviewCreateSerializer,
    ReviewModerationSerializer, PendingReviewSerializer, ReviewUpdateSerializer
)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def review_create(request):
    """
    Create a new review for an app.
    Review is automatically set to 'pending' status.
    """
    serializer = ReviewCreateSerializer(data=request.data, context={'request': request})
    
    if serializer.is_valid():
        review = serializer.save()
        detail_serializer = ReviewDetailSerializer(review)
        return Response(
            detail_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def review_list_user(request):
    """
    Get all reviews by the current user.
    """
    reviews = Review.objects.filter(user=request.user).order_by('-created_at')
    serializer = ReviewListSerializer(reviews, many=True)
    
    return Response({
        'reviews': serializer.data,
        'count': len(serializer.data)
    })


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def review_detail(request, review_id):
    """
    Get, update, or delete a specific review.
    Users can only modify their own pending reviews.
    """
    try:
        review = Review.objects.get(id=review_id)
    except Review.DoesNotExist:
        return Response({
            'error': 'Review not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check permissions
    if review.user != request.user and not request.user.groups.filter(name='supervisors').exists():
        return Response({
            'error': 'Permission denied'
        }, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        serializer = ReviewDetailSerializer(review)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        # Only allow updates by the review author and only for pending reviews
        if review.user != request.user:
            return Response({
                'error': 'You can only edit your own reviews'
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = ReviewUpdateSerializer(review, data=request.data)
        if serializer.is_valid():
            updated_review = serializer.save()
            detail_serializer = ReviewDetailSerializer(updated_review)
            return Response(detail_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        # Only allow deletion by the review author for pending reviews
        if review.user != request.user:
            return Response({
                'error': 'You can only delete your own reviews'
            }, status=status.HTTP_403_FORBIDDEN)
        
        if review.status != 'pending':
            return Response({
                'error': 'You can only delete pending reviews'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        review.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_reviews(request):
    """
    Get all pending reviews for supervisor approval.
    Only accessible by users in the 'supervisors' group.
    """
    # Check if user is a supervisor
    if not request.user.groups.filter(name='supervisors').exists():
        return Response({
            'error': 'Access denied. Supervisor privileges required.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    pending_reviews = Review.get_pending_reviews()
    serializer = PendingReviewSerializer(pending_reviews, many=True)
    
    return Response({
        'pending_reviews': serializer.data,
        'count': len(serializer.data)
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def review_moderate(request, review_id):
    """
    Approve or reject a review.
    Only accessible by users in the 'supervisors' group.
    """
    # Check if user is a supervisor
    if not request.user.groups.filter(name='supervisors').exists():
        return Response({
            'error': 'Access denied. Supervisor privileges required.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        review = Review.objects.get(id=review_id)
    except Review.DoesNotExist:
        return Response({
            'error': 'Review not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    if review.status != 'pending':
        return Response({
            'error': 'Review is not pending approval'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = ReviewModerationSerializer(data=request.data)
    if serializer.is_valid():
        action = serializer.validated_data['action']
        
        if action == 'approve':
            review.approve(request.user)
            message = 'Review approved successfully'
        else:  # reject
            rejection_reason = serializer.validated_data.get('rejection_reason', '')
            review.reject(request.user, rejection_reason)
            message = 'Review rejected successfully'
        
        detail_serializer = ReviewDetailSerializer(review)
        return Response({
            'message': message,
            'review': detail_serializer.data
        })
    
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def review_stats(request):
    """
    Get review statistics for the current user.
    """
    user_reviews = Review.objects.filter(user=request.user)
    
    stats = {
        'total_reviews': user_reviews.count(),
        'pending_reviews': user_reviews.filter(status='pending').count(),
        'approved_reviews': user_reviews.filter(status='approved').count(),
        'rejected_reviews': user_reviews.filter(status='rejected').count(),
        'average_rating_given': 0.0,
        'total_helpful_votes': 0,
    }
    
    if user_reviews.exists():
        # Calculate average rating given by user
        ratings = user_reviews.values_list('rating', flat=True)
        stats['average_rating_given'] = round(sum(ratings) / len(ratings), 2)
        
        # Calculate total helpful votes received
        approved_reviews = user_reviews.filter(status='approved')
        stats['total_helpful_votes'] = sum([r.helpful_votes for r in approved_reviews])
    
    return Response(stats)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def supervisor_stats(request):
    """
    Get moderation statistics for supervisors.
    """
    if not request.user.groups.filter(name='supervisors').exists():
        return Response({
            'error': 'Access denied. Supervisor privileges required.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Get reviews moderated by this supervisor
    moderated_reviews = Review.objects.filter(reviewed_by=request.user)
    
    stats = {
        'total_moderated': moderated_reviews.count(),
        'approved_count': moderated_reviews.filter(status='approved').count(),
        'rejected_count': moderated_reviews.filter(status='rejected').count(),
        'pending_system_wide': Review.objects.filter(status='pending').count(),
    }
    
    return Response(stats)
