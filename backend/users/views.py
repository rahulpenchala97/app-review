from django.contrib.auth.models import User, Group
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .models import UserProfile
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserProfileSerializer,
    UserProfileUpdateSerializer, UserSerializer, SupervisorPromotionSerializer
)


def get_tokens_for_user(user):
    """Generate JWT tokens for user"""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
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
                'is_staff': user.is_staff,
            },
            'tokens': tokens
        })
    
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )


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
    Get list of all users (for supervisors/admins).
    """
    # Check if user has permission to view user list
    if not (request.user.is_staff or request.user.groups.filter(name='supervisors').exists()):
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
    
    serializer = UserSerializer(users, many=True)
    return Response({
        'users': serializer.data,
        'count': len(serializer.data)
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def promote_to_supervisor(request):
    """
    Promote a user to supervisor role.
    Only accessible by admin users.
    """
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
@permission_classes([IsAdminUser])
def revoke_supervisor(request, user_id):
    """
    Remove supervisor role from a user.
    Only accessible by admin users.
    """
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
    Get list of all supervisors.
    """
    if not (request.user.is_staff or request.user.groups.filter(name='supervisors').exists()):
        return Response({
            'error': 'Permission denied'
        }, status=status.HTTP_403_FORBIDDEN)
    
    supervisors_group = Group.objects.get_or_create(name='supervisors')[0]
    supervisors = User.objects.filter(groups=supervisors_group).order_by('username')
    
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
