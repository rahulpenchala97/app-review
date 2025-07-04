from rest_framework import serializers
from .models import Review
from apps.models import App
from django.contrib.auth.models import User


class ReviewListSerializer(serializers.ModelSerializer):
    """Serializer for review lists"""
    username = serializers.CharField(source='user.username', read_only=True)
    app_name = serializers.CharField(source='app.name', read_only=True)
    
    class Meta:
        model = Review
        fields = [
            'id', 'app', 'title', 'content', 'rating', 'status',
            'username', 'app_name', 'created_at', 'rejection_reason'
        ]


class ReviewDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for individual reviews"""
    username = serializers.CharField(source='user.username', read_only=True)
    app_name = serializers.CharField(source='app.name', read_only=True)
    reviewed_by_username = serializers.CharField(source='reviewed_by.username', read_only=True)
    
    class Meta:
        model = Review
        fields = [
            'id', 'title', 'content', 'rating', 'status',
            'username', 'app_name', 'reviewed_by_username',
            'reviewed_at', 'rejection_reason', 'helpful_votes',
            'total_votes', 'tags', 'created_at', 'updated_at'
        ]


class ReviewCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new reviews"""
    
    class Meta:
        model = Review
        fields = ['app', 'title', 'content', 'rating', 'tags']
    
    def validate(self, data):
        """Validate review creation"""
        user = self.context['request'].user
        app = data.get('app')
        
        # Check if user already has a review for this app
        if Review.objects.filter(user=user, app=app).exists():
            raise serializers.ValidationError(
                "You have already submitted a review for this app."
            )
        
        return data
    
    def create(self, validated_data):
        """Create review with pending status"""
        validated_data['user'] = self.context['request'].user
        validated_data['status'] = 'pending'
        return super().create(validated_data)


class ReviewModerationSerializer(serializers.Serializer):
    """Serializer for review moderation actions"""
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    rejection_reason = serializers.CharField(
        required=False, 
        allow_blank=True,
        help_text="Required when rejecting a review"
    )
    
    def validate(self, data):
        """Validate moderation data"""
        if data.get('action') == 'reject' and not data.get('rejection_reason'):
            raise serializers.ValidationError(
                "Rejection reason is required when rejecting a review."
            )
        return data


class PendingReviewSerializer(serializers.ModelSerializer):
    """Serializer for pending reviews (supervisor view)"""
    username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    app_name = serializers.CharField(source='app.name', read_only=True)
    app_developer = serializers.CharField(source='app.developer', read_only=True)
    
    class Meta:
        model = Review
        fields = [
            'id', 'title', 'content', 'rating',
            'username', 'user_email', 'app_name', 'app_developer',
            'created_at', 'tags'
        ]


class ReviewUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating existing reviews (before approval)"""
    
    class Meta:
        model = Review
        fields = ['title', 'content', 'rating', 'tags']
    
    def validate(self, data):
        """Only allow updates for pending reviews"""
        review = self.instance
        if review.status != 'pending':
            raise serializers.ValidationError(
                "You can only edit reviews that are still pending approval."
            )
        return data
