from django.contrib.auth.models import User, Group
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from app_review_project.pagination import StandardResultsSetPagination
from .models import UserProfile
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserProfileSerializer,
    UserProfileUpdateSerializer, UserSerializer, SupervisorPromotionSerializer
)


def get_tokens_for_user(user):
    """Generate JWT tokens with expiry information for user"""
    refresh = RefreshToken.for_user(user)
    access_token = refresh.access_token
    
    return {
        'refresh': str(refresh),
        'access': str(access_token),
        'access_expires_at': access_token['exp'],
        'refresh_expires_at': refresh['exp'],
        'expires_in': 15 * 60,  # 15 minutes in seconds
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def user_register(request):
    """
    Register a new user account.
    """
    serializer = UserRegistrationSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        tokens = get_tokens_for_user(user)
        
        return Response({
            'message': 'User registered successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            'tokens': tokens
        }, status=status.HTTP_201_CREATED)
    
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def user_login(request):
    """
    Login user and return JWT tokens.
    """
    serializer = UserLoginSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.validated_data['user']
        tokens = get_tokens_for_user(user)
        
        return Response({
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_supervisor': user.groups.filter(name='supervisors').exists(),
                'is_superuser': user.is_superuser,
            },
            'tokens': tokens
        })
    
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )


class CustomTokenRefreshView(TokenRefreshView):
    """
    Custom token refresh view that includes expiry information in response.
    """
    def post(self, request, *args, **kwargs):
        try:
            response = super().post(request, *args, **kwargs)
            
            if response.status_code == 200:
                # Add expiry information to refresh response
                refresh_token = RefreshToken(request.data['refresh'])
                access_token = refresh_token.access_token
                
                response.data.update({
                    'access_expires_at': access_token['exp'],
                    'expires_in': 15 * 60,  # 15 minutes in seconds
                })
                
            return response
            
        except (TokenError, InvalidToken) as e:
            return Response(
                {'detail': 'Token is invalid or expired'},
                status=status.HTTP_401_UNAUTHORIZED
            )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_logout(request):
    """
    Logout user. Since JWT tokens are stateless, we just return a success message.
    The frontend should remove the tokens from storage.
    """
    return Response({
        'message': 'Logout successful'
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """
    Get current user's profile information.
    """
    try:
        profile = request.user.profile
    except UserProfile.DoesNotExist:
        # Create profile if it doesn't exist
        profile = UserProfile.objects.create(user=request.user)
    
    serializer = UserProfileSerializer(profile)
    return Response(serializer.data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def user_profile_update(request):
    """
    Update current user's profile information.
    """
    try:
        profile = request.user.profile
    except UserProfile.DoesNotExist:
        profile = UserProfile.objects.create(user=request.user)
    
    serializer = UserProfileUpdateSerializer(
        profile, 
        data=request.data, 
        partial=(request.method == 'PATCH')
    )
    
    if serializer.is_valid():
        updated_profile = serializer.save()
        response_serializer = UserProfileSerializer(updated_profile)
        return Response({
            'message': 'Profile updated successfully',
            'profile': response_serializer.data
        })
    
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def refresh_user_stats(request):
    """
    Refresh user's review statistics.
    """
    try:
        profile = request.user.profile
        profile.update_review_stats()
        serializer = UserProfileSerializer(profile)
        return Response({
            'message': 'Statistics updated successfully',
            'profile': serializer.data
        })
    except UserProfile.DoesNotExist:
        return Response({
            'error': 'User profile not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_list(request):
    """
    Get list of all users (for supervisors/admins) with pagination.
    """
    # Check if user has permission to view user list
    if not (request.user.is_superuser or request.user.groups.filter(name='supervisors').exists()):
        return Response({
            'error': 'Permission denied'
        }, status=status.HTTP_403_FORBIDDEN)
    
    users = User.objects.all().order_by('username')
    
    # Optional filtering
    search = request.GET.get('search')
    if search:
        users = users.filter(
            username__icontains=search
        ) | users.filter(
            email__icontains=search
        ) | users.filter(
            first_name__icontains=search
        ) | users.filter(
            last_name__icontains=search
        )
    
    # Apply pagination
    paginator = StandardResultsSetPagination()
    page = paginator.paginate_queryset(users, request)

    if page is not None:
        serializer = UserSerializer(page, many=True)
        response_data = paginator.get_paginated_response(serializer.data)
        # Update the structure to match expected format
        response_data.data['users'] = response_data.data.pop('results')
        return response_data

    # Fallback for when pagination is not applied
    serializer = UserSerializer(users, many=True)
    return Response({
        'users': serializer.data,
        'count': len(serializer.data)
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def promote_to_supervisor(request):
    """
    Promote a user to supervisor role.
    Only accessible by superusers.
    """
    if not request.user.is_superuser:
        return Response({
            'error': 'Only superusers can promote users to supervisors'
        }, status=status.HTTP_403_FORBIDDEN)

    serializer = SupervisorPromotionSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        return Response({
            'message': f'User {user.username} has been promoted to supervisor',
            'user': UserSerializer(user).data
        })
    
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def revoke_supervisor(request, user_id):
    """
    Remove supervisor role from a user.
    Only accessible by superusers.
    """
    if not request.user.is_superuser:
        return Response({
            'error': 'Only superusers can revoke supervisor roles'
        }, status=status.HTTP_403_FORBIDDEN)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    supervisors_group = Group.objects.get(name='supervisors')
    if not user.groups.filter(name='supervisors').exists():
        return Response({
            'error': 'User is not a supervisor'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    user.groups.remove(supervisors_group)
    
    return Response({
        'message': f'Supervisor role removed from {user.username}',
        'user': UserSerializer(user).data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def supervisor_list(request):
    """
    Get list of all supervisors with pagination.
    """
    if not (request.user.is_superuser or request.user.groups.filter(name='supervisors').exists()):
        return Response({
            'error': 'Permission denied'
        }, status=status.HTTP_403_FORBIDDEN)
    
    supervisors_group = Group.objects.get_or_create(name='supervisors')[0]
    supervisors = User.objects.filter(groups=supervisors_group).order_by('username')
    
    # Apply pagination
    paginator = StandardResultsSetPagination()
    page = paginator.paginate_queryset(supervisors, request)

    if page is not None:
        serializer = UserSerializer(page, many=True)
        response_data = paginator.get_paginated_response(serializer.data)
        # Update the structure to match expected format
        response_data.data['supervisors'] = response_data.data.pop('results')
        return response_data

    # Fallback for when pagination is not applied
    serializer = UserSerializer(supervisors, many=True)
    return Response({
        'supervisors': serializer.data,
        'count': len(serializer.data)
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    Change user password.
    """
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    confirm_password = request.data.get('confirm_password')
    
    if not all([old_password, new_password, confirm_password]):
        return Response({
            'error': 'All password fields are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if not request.user.check_password(old_password):
        return Response({
            'error': 'Current password is incorrect'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if new_password != confirm_password:
        return Response({
            'error': 'New passwords do not match'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if len(new_password) < 8:
        return Response({
            'error': 'Password must be at least 8 characters long'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    request.user.set_password(new_password)
    request.user.save()
    
    return Response({
        'message': 'Password changed successfully'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_promote_supervisors(request):
    """
    Promote multiple users to supervisor role at once.
    Only accessible by superusers.
    """
    if not request.user.is_superuser:
        return Response({
            'error': 'Only superusers can promote users to supervisors'
        }, status=status.HTTP_403_FORBIDDEN)

    user_ids = request.data.get('user_ids', [])
    if not user_ids:
        return Response({
            'error': 'No user IDs provided'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        users = User.objects.filter(id__in=user_ids)
        supervisors_group = Group.objects.get_or_create(name='supervisors')[0]

        promoted_users = []
        for user in users:
            if not user.groups.filter(name='supervisors').exists():
                user.groups.add(supervisors_group)
                promoted_users.append(user)

        return Response({
            'message': f'{len(promoted_users)} users promoted to supervisors',
            'promoted_users': [UserSerializer(user).data for user in promoted_users]
        })
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
