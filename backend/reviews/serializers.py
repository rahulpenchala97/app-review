from rest_framework import serializers
from .models import Review
from apps.models import App
from django.contrib.auth.models import User


class ReviewListSerializer(serializers.ModelSerializer):
    """Serializer for review lists"""
    username = serializers.CharField(source='user.username', read_only=True)
    app_name = serializers.CharField(source='app.name', read_only=True)
    approval_summary = serializers.SerializerMethodField()
    required_approvals = serializers.SerializerMethodField()
    
    class Meta:
        model = Review
        fields = [
            'id', 'app', 'title', 'content', 'rating', 'status',
            'username', 'app_name', 'created_at', 'rejection_reason',
            'approval_summary', 'required_approvals'
        ]

    def get_approval_summary(self, obj):
        """Get approval summary for the review"""
        return obj.get_approval_summary()

    def get_required_approvals(self, obj):
        """Get required approvals for majority"""
        summary = obj.get_approval_summary()
        return summary['total_supervisors'] // 2 + 1


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
    approval_summary = serializers.SerializerMethodField()
    required_approvals = serializers.SerializerMethodField()
    my_decision = serializers.SerializerMethodField()
    
    class Meta:
        model = Review
        fields = [
            'id', 'title', 'content', 'rating', 'status',
            'username', 'user_email', 'app_name', 'app_developer',
            'created_at', 'tags', 'approval_summary', 'required_approvals', 'my_decision'
        ]

    def get_approval_summary(self, obj):
        """Get approval summary for the review"""
        return obj.get_approval_summary()

    def get_required_approvals(self, obj):
        """Get required approvals for majority"""
        summary = obj.get_approval_summary()
        return summary['total_supervisors'] // 2 + 1

    def get_my_decision(self, obj):
        """Get the current user's decision for this review"""
        request = self.context.get('request')
        if request and request.user:
            return obj.get_supervisor_decision(request.user)
        return 'pending'


class ReviewUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating existing reviews"""
    
    class Meta:
        model = Review
        fields = ['title', 'content', 'rating', 'tags']
    
    def validate(self, data):
        """Allow updates for pending, approved, or rejected reviews"""
        review = self.instance

        # Users can edit their reviews regardless of status
        # If the review was approved or rejected, editing will reset it to pending
        return data

    def update(self, instance, validated_data):
        """Update review and reset to pending if it was approved/rejected"""
        # If the review was approved or rejected, reset it to pending status
        # and clear approval-related fields to trigger supervisor workflow again
        if instance.status in ['approved', 'rejected']:
            validated_data['status'] = 'pending'
            validated_data['reviewed_by'] = None
            validated_data['reviewed_at'] = None
            validated_data['rejection_reason'] = ''

            # Clear any existing supervisor approvals since this is essentially a new review
            # Note: This assumes there's a method to clear approvals or they'll be handled in the model
            if hasattr(instance, 'clear_supervisor_approvals'):
                instance.clear_supervisor_approvals()

        return super().update(instance, validated_data)
