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
    Users can edit their own reviews (editing approved/rejected reviews resets them to pending).
    Users can only delete their own pending reviews.
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
        # Only allow updates by the review author
        # Editing approved/rejected reviews will reset them to pending status
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
        serializer = PendingReviewSerializer(
            page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)

    # Fallback for when pagination is not applied
    serializer = PendingReviewSerializer(
        pending_reviews, many=True, context={'request': request})
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
            'error': 'Review is not pending approval. Only pending reviews can be moderated.'
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
            # Get reviews with conflict status requiring admin resolution
            reviews = Review.objects.filter(status='conflict')
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

                    # Get approval summary and supervisor's decision
                    approval_summary = review.get_approval_summary()
                    my_decision = review.get_supervisor_decision(request.user)

                    review_data = {
                        'id': review.id,
                        'content': review.content,
                        'rating': review.rating,
                        'app_name': app_name,
                        'author': review.user.username,
                        'created_at': created_at_str,
                        'approval_status': review.status,
                        'required_approvals': approval_summary['total_supervisors'] // 2 + 1,
                        'approval_summary': approval_summary,
                        'my_decision': my_decision
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

                # Get approval summary and supervisor's decision
                approval_summary = review.get_approval_summary()
                print(
                    f"Approval summary for review {review.id}: {approval_summary}")
                my_decision = review.get_supervisor_decision(request.user)

                # Get detailed supervisor decisions for display
                supervisor_decisions = []
                for approval in review.approvals.select_related('supervisor').all():
                    supervisor_decisions.append({
                        'supervisor_name': approval.supervisor.username,
                        'decision': approval.decision,
                        'comments': approval.comments,
                        'created_at': approval.created_at.isoformat(),
                    })

                review_data = {
                    'id': review.id,
                    'content': review.content,
                    'rating': review.rating,
                    'app_name': app_name,
                    'author': review.user.username,
                    'created_at': created_at_str,
                    'approval_status': review.status,
                    # Majority rule
                    'required_approvals': approval_summary['total_supervisors'] // 2 + 1,
                    'approval_summary': approval_summary,
                    'my_decision': my_decision,
                    'supervisor_decisions': supervisor_decisions
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

    # Prevent modifying already approved or rejected reviews
    if review.status != 'pending':
        return Response({
            'error': 'Review is not pending approval. Only pending reviews can be moderated.'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Import ReviewApproval model
    from .models import ReviewApproval

    # Create or update the supervisor's decision
    approval, created = ReviewApproval.objects.update_or_create(
        review=review,
        supervisor=request.user,
        defaults={
            'decision': decision,
            'comments': comments
        }
    )

    # Check if the review should be finalized
    final_status = review.check_and_finalize_status()

    # Get updated approval summary
    approval_summary = review.get_approval_summary()

    action_word = "updated" if not created else "recorded"
    message = f'Your {decision} decision has been {action_word}.'

    if final_status != 'pending':
        message += f' The review has been {final_status}.'

    return Response({
        'message': message,
        'review_status': review.status,
        'approval_summary': approval_summary,
        'my_decision': decision
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

    # Get reviews with conflict status
    conflict_reviews = Review.objects.filter(status='conflict').select_related(
        'app', 'user', 'reviewed_by'
    ).prefetch_related('approvals__supervisor')

    conflicted_reviews = []
    for review in conflict_reviews:
        # Get all supervisor decisions
        decisions = []
        for approval in review.approvals.all().order_by('-created_at'):
            decisions.append({
                'supervisor': approval.supervisor.username,
                'decision': approval.decision,
                'comments': approval.comments or '',
                'timestamp': approval.created_at.isoformat()
            })

        conflicted_reviews.append({
            'id': review.id,
            'title': review.title,
            'content': review.content,
            'rating': review.rating,
            'app_name': review.app.name,
            'author': review.user.username,
            'created_at': review.created_at.isoformat(),
            'status': 'conflicted',  # Frontend expects 'conflicted'
            'summary': review.get_approval_summary(),
            'decisions': decisions
        })

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

    # Only allow resolution of conflict status reviews
    if review.status != 'conflict':
        return Response({
            'error': 'Review is not in conflict status'
        }, status=status.HTTP_400_BAD_REQUEST)

    final_decision = request.data.get(
        'final_decision')  # 'approved' or 'rejected'
    resolution_notes = request.data.get('resolution_notes', '')

    if final_decision not in ['approved', 'rejected']:
        return Response({
            'error': 'Final decision must be either "approved" or "rejected"'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Update review status
    review.status = final_decision
    review.reviewed_by = request.user
    review.reviewed_at = timezone.now()

    # Store resolution notes in rejection_reason field for now
    # (could be extended with a separate resolution_notes field)
    if resolution_notes:
        if final_decision == 'rejected':
            review.rejection_reason = resolution_notes
        else:
            # For approved reviews, you might want to add a resolution_notes field
            # For now, we'll just log it
            pass

    review.save()

    # Update app rating if approved
    if final_decision == 'approved' and hasattr(review, 'app'):
        review.app.update_average_rating()

    return Response({
        'message': f'Conflict resolved: Review {final_decision}',
        'review_id': review.id,
        'final_decision': final_decision
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def review_supervisor_decisions(request, review_id):
    """
    Get detailed supervisor decisions for a specific review
    """
    if not request.user.groups.filter(name='supervisors').exists():
        return Response({
            'error': 'Only supervisors can view detailed decisions'
        }, status=status.HTTP_403_FORBIDDEN)

    try:
        review = Review.objects.get(id=review_id)
    except Review.DoesNotExist:
        return Response({
            'error': 'Review not found'
        }, status=status.HTTP_404_NOT_FOUND)

    # Get all supervisor decisions for this review
    decisions = review.approvals.select_related('supervisor').all()

    decision_data = []
    for decision in decisions:
        decision_data.append({
            'supervisor_id': decision.supervisor.id,
            'supervisor_name': decision.supervisor.username,
            'supervisor_email': decision.supervisor.email,
            'decision': decision.decision,
            'comments': decision.comments,
            'created_at': decision.created_at.isoformat(),
        })

    # Get overall summary
    approval_summary = review.get_approval_summary()

    return Response({
        'review_id': review.id,
        'review_status': review.status,
        'approval_summary': approval_summary,
        'required_approvals': approval_summary['total_supervisors'] // 2 + 1,
        'decisions': decision_data,
        'my_decision': review.get_supervisor_decision(request.user)
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_override_review(request, review_id):
    """
    Admin direct override - bypass supervisor voting entirely
    Allows admin to set any review to approved/rejected/pending regardless of current status
    """
    if not request.user.is_superuser:
        return Response({
            'error': 'Only superusers can perform admin overrides'
        }, status=status.HTTP_403_FORBIDDEN)

    try:
        review = Review.objects.get(id=review_id)
    except Review.DoesNotExist:
        return Response({
            'error': 'Review not found'
        }, status=status.HTTP_404_NOT_FOUND)

    # 'approved', 'rejected', or 'pending'
    new_status = request.data.get('status')
    rejection_reason = request.data.get('rejection_reason', '')

    if new_status not in ['approved', 'rejected', 'pending']:
        return Response({
            'error': 'Status must be "approved", "rejected", or "pending"'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Store the original status for logging
    original_status = review.status

    # If setting back to pending, clear supervisor approvals and reviewed fields
    if new_status == 'pending':
        review.clear_supervisor_approvals()
        review.reviewed_by = None
        review.reviewed_at = None
        review.rejection_reason = ''
    else:
        # Update review status directly for approved/rejected
        review.reviewed_by = request.user
        review.reviewed_at = timezone.now()

        # Handle rejection reason
        if new_status == 'rejected' and rejection_reason:
            review.rejection_reason = f"Admin Override: {rejection_reason}"
        elif new_status == 'rejected' and not rejection_reason:
            review.rejection_reason = "Admin Override: No reason provided"

    # Update status
    review.status = new_status

    # Add override metadata
    if not hasattr(review, 'metadata') or not review.metadata:
        review.metadata = {}
    review.metadata['admin_override'] = True
    review.metadata['original_status'] = original_status
    review.metadata['override_timestamp'] = timezone.now().isoformat()

    review.save()

    # Update app rating if approved
    if new_status == 'approved' and hasattr(review, 'app'):
        review.app.update_average_rating()

    # Return the updated review data
    serializer = ReviewDetailSerializer(review)

    return Response({
        'message': f'Admin override successful: Review set to {new_status}',
        'review_id': review.id,
        'status': new_status,
        'original_status': original_status,
        **serializer.data  # Include full review data
    })
