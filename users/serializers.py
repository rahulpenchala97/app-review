from rest_framework import serializers
from django.contrib.auth.models import User, Group
from .models import UserProfile
from django.contrib.auth import authenticate


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'password_confirm']
    
    def validate(self, data):
        """Validate password confirmation"""
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords do not match.")
        return data
    
    def validate_email(self, value):
        """Validate email uniqueness"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def create(self, validated_data):
        """Create user with hashed password"""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        """Validate user credentials"""
        username = data.get('username')
        password = data.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError("Invalid credentials.")
            if not user.is_active:
                raise serializers.ValidationError("User account is disabled.")
            data['user'] = user
        else:
            raise serializers.ValidationError("Must include username and password.")
        
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile"""
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    is_supervisor = serializers.SerializerMethodField()
    
    class Meta:
        model = UserProfile
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'bio', 'avatar', 'location', 'email_notifications',
            'review_notifications', 'reputation_score', 'total_reviews',
            'helpful_review_count', 'is_supervisor', 'created_at'
        ]
    
    def get_is_supervisor(self, obj):
        return obj.is_supervisor


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile"""
    first_name = serializers.CharField(source='user.first_name', required=False)
    last_name = serializers.CharField(source='user.last_name', required=False)
    email = serializers.EmailField(source='user.email', required=False)
    
    class Meta:
        model = UserProfile
        fields = [
            'first_name', 'last_name', 'email', 'bio', 'avatar',
            'location', 'email_notifications', 'review_notifications',
            'preferences'
        ]
    
    def update(self, instance, validated_data):
        """Update both user and profile"""
        user_data = validated_data.pop('user', {})
        
        # Update user fields
        for attr, value in user_data.items():
            setattr(instance.user, attr, value)
        instance.user.save()
        
        # Update profile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        return instance


class UserSerializer(serializers.ModelSerializer):
    """Basic user serializer"""
    is_supervisor = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_supervisor']
    
    def get_is_supervisor(self, obj):
        return obj.groups.filter(name='supervisors').exists()


class SupervisorPromotionSerializer(serializers.Serializer):
    """Serializer for promoting users to supervisors"""
    user_id = serializers.IntegerField()
    
    def validate_user_id(self, value):
        """Validate user exists"""
        try:
            user = User.objects.get(id=value)
            if user.groups.filter(name='supervisors').exists():
                raise serializers.ValidationError("User is already a supervisor.")
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("User does not exist.")
    
    def create(self, validated_data):
        """Add user to supervisors group"""
        user = User.objects.get(id=validated_data['user_id'])
        supervisors_group, created = Group.objects.get_or_create(name='supervisors')
        user.groups.add(supervisors_group)
        return user
