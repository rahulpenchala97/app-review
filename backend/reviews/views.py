from django.http import JsonResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import Group
from django.core.paginator import Paginator
from app_review_project.pagination import StandardResultsSetPagination, SmallResultsSetPagination
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
    Get all reviews by the current user with pagination.
    """
    reviews = Review.objects.filter(user=request.user).order_by('-created_at')

    # Apply pagination
    paginator = SmallResultsSetPagination()
    page = paginator.paginate_queryset(reviews, request)

    if page is not None:
        serializer = ReviewListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    # Fallback for when pagination is not applied
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
    Get all pending reviews for supervisor approval with pagination.
    Only accessible by users in the 'supervisors' group.
    """
    # Check if user is a supervisor
    if not request.user.groups.filter(name='supervisors').exists():
        return Response({
            'error': 'Access denied. Supervisor privileges required.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    pending_reviews = Review.get_pending_reviews()

    # Apply pagination
    paginator = StandardResultsSetPagination()
    page = paginator.paginate_queryset(pending_reviews, request)

    if page is not None:
        serializer = PendingReviewSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    # Fallback for when pagination is not applied
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reviews_for_moderation(request):
    """
    Get reviews that need moderation by supervisors with pagination.
    """
    try:
        # Debug: Log user info
        print(f"User: {request.user.username}")
        print(f"Is superuser: {request.user.is_superuser}")
        print(
            f"Is supervisor: {request.user.groups.filter(name='supervisors').exists()}")

        # Temporarily allow all authenticated users for testing
        # if not (request.user.groups.filter(name='supervisors').exists() or request.user.is_superuser):
        #     return Response({
        #         'error': 'Access denied. Supervisor privileges required.'
        #     }, status=status.HTTP_403_FORBIDDEN)

        filter_param = request.GET.get('filter', 'pending')
        print(f"Filter param: {filter_param}")

        if filter_param == 'all':
            reviews = Review.objects.all()
        elif filter_param == 'pending':
            reviews = Review.objects.filter(status='pending')
        elif filter_param == 'approved':
            reviews = Review.objects.filter(status='approved')
        elif filter_param == 'rejected':
            reviews = Review.objects.filter(status='rejected')
        elif filter_param == 'conflicted':
            # For now, return empty queryset for conflicted
            reviews = Review.objects.none()
        else:
            reviews = Review.objects.filter(status='pending')

        reviews = reviews.order_by('-created_at')
        print(f"Found {reviews.count()} reviews")

        # Apply pagination
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(reviews, request)

        if page is not None:
            # Process reviews for the current page
            reviews_data = []
            for review in page:
                try:
                    # Get app name safely
                    app_name = 'Unknown App'
                    try:
                        if review.app:
                            app_name = review.app.name
                    except Exception as e:
                        print(f"Error getting app name: {e}")
                        app_name = 'Unknown App'

                    # Convert datetime to string for JSON serialization
                    created_at_str = review.created_at.isoformat() if review.created_at else None

                    review_data = {
                        'id': review.id,
                        'content': review.content,
                        'rating': review.rating,
                        'app_name': app_name,
                        'author': review.user.username,
                        'created_at': created_at_str,
                        'approval_status': review.status,  # Use the actual status field
                        'required_approvals': 2,  # Default value
                        'approval_summary': {
                            'total_supervisors': 1,
                            'approved': 1 if review.status == 'approved' else 0,
                            'rejected': 1 if review.status == 'rejected' else 0,
                            'pending': 1 if review.status == 'pending' else 0,
                        },
                        'my_decision': 'pending'  # Default for now
                    }
                    reviews_data.append(review_data)
                except Exception as e:
                    print(f"Error processing review {review.id}: {e}")
                    continue

            # Return paginated response
            response_data = paginator.get_paginated_response(reviews_data)
            # Update the structure to match frontend expectations
            response_data.data['reviews'] = response_data.data.pop('results')
            return response_data

        # Fallback for when pagination is not applied
        reviews_data = []
        for review in reviews:
            try:
                # Get app name safely
                app_name = 'Unknown App'
                try:
                    if review.app:
                        app_name = review.app.name
                except Exception as e:
                    print(f"Error getting app name: {e}")
                    app_name = 'Unknown App'

                # Convert datetime to string for JSON serialization
                created_at_str = review.created_at.isoformat() if review.created_at else None

                review_data = {
                    'id': review.id,
                    'content': review.content,
                    'rating': review.rating,
                    'app_name': app_name,
                    'author': review.user.username,
                    'created_at': created_at_str,
                    'approval_status': review.status,  # Use the actual status field
                    'required_approvals': 2,  # Default value
                    'approval_summary': {
                        'total_supervisors': 1,
                        'approved': 1 if review.status == 'approved' else 0,
                        'rejected': 1 if review.status == 'rejected' else 0,
                        'pending': 1 if review.status == 'pending' else 0,
                    },
                    'my_decision': 'pending'  # Default for now
                }
                reviews_data.append(review_data)
            except Exception as e:
                print(f"Error processing review {review.id}: {e}")
                continue

        print(f"Returning {len(reviews_data)} reviews")
        return Response({
            'reviews': reviews_data,
            'count': len(reviews_data)
        })

    except Exception as e:
        print(f"Error in reviews_for_moderation: {e}")
        import traceback
        traceback.print_exc()
        return Response({
            'error': f'Internal server error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def supervisor_review_decision(request, review_id):
    """
    Allow supervisor to approve/reject a review
    """
    if not request.user.groups.filter(name='supervisors').exists():
        return Response({
            'error': 'Only supervisors can make review decisions'
        }, status=status.HTTP_403_FORBIDDEN)

    try:
        review = Review.objects.get(id=review_id)
    except Review.DoesNotExist:
        return Response({
            'error': 'Review not found'
        }, status=status.HTTP_404_NOT_FOUND)

    decision = request.data.get('decision')  # 'approved' or 'rejected'
    comments = request.data.get('comments', '')

    if decision not in ['approved', 'rejected']:
        return Response({
            'error': 'Decision must be either "approved" or "rejected"'
        }, status=status.HTTP_400_BAD_REQUEST)

    # For now, just update the review status directly
    # In a full implementation, you'd create ReviewApproval records
    if decision == 'approved':
        review.status = 'approved'
        review.reviewed_by = request.user
        review.reviewed_at = timezone.now()
    else:
        review.status = 'rejected'
        review.reviewed_by = request.user
        review.reviewed_at = timezone.now()
        review.rejection_reason = comments

    review.save()

    return Response({
        'message': f'Review {decision} successfully',
        'review_status': review.status,
        'approval_summary': {
            'total_supervisors': 1,
            'approved': 1 if decision == 'approved' else 0,
            'rejected': 1 if decision == 'rejected' else 0,
            'pending': 0,
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conflicted_reviews(request):
    """
    Get all reviews with conflicts for resolution
    """
    if not request.user.is_superuser:
        return Response({
            'error': 'Only superusers can view conflicted reviews'
        }, status=status.HTTP_403_FORBIDDEN)

    # For now, return empty list since we don't have the full conflict system implemented
    # In a full implementation, you'd query for reviews with 'conflicted' or 'escalated' status
    conflicted_reviews = []

    return Response({
        'conflicted_reviews': conflicted_reviews,
        'count': len(conflicted_reviews)
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resolve_conflict(request, review_id):
    """
    Superuser resolves conflicts manually
    """
    if not request.user.is_superuser:
        return Response({
            'error': 'Only superusers can resolve conflicts'
        }, status=status.HTTP_403_FORBIDDEN)

    try:
        review = Review.objects.get(id=review_id)
    except Review.DoesNotExist:
        return Response({
            'error': 'Review not found'
        }, status=status.HTTP_404_NOT_FOUND)

    final_decision = request.data.get(
        'final_decision')  # 'approved' or 'rejected'
    resolution_notes = request.data.get('resolution_notes', '')

    if final_decision not in ['approved', 'rejected']:
        return Response({
            'error': 'Final decision must be either "approved" or "rejected"'
        }, status=status.HTTP_400_BAD_REQUEST)

    review.status = final_decision
    review.reviewed_by = request.user
    review.reviewed_at = timezone.now()
    if hasattr(review, 'resolution_notes'):
        review.resolution_notes = resolution_notes
    review.save()

    return Response({
        'message': f'Conflict resolved: Review {final_decision}',
        'review_id': review.id,
        'final_decision': final_decision
    })
