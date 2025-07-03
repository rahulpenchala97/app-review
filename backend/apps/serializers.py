from rest_framework import serializers
from .models import App
from reviews.models import Review


class AppListSerializer(serializers.ModelSerializer):
    """Serializer for app list/search results"""
    
    class Meta:
        model = App
        fields = [
            'id', 'name', 'developer', 'category', 
            'average_rating', 'total_ratings', 'created_at'
        ]


class ReviewSummarySerializer(serializers.ModelSerializer):
    """Serializer for review summary in app detail"""
    username = serializers.CharField(source='user.username', read_only=True)
    user = serializers.SerializerMethodField()
    
    class Meta:
        model = Review
        fields = [
            'id', 'title', 'content', 'rating', 
            'username', 'user', 'created_at', 'status', 'tags'
        ]
    
    def get_user(self, obj):
        if obj.user:
            return {
                'id': obj.user.id,
                'username': obj.user.username,
                'first_name': obj.user.first_name or '',
                'last_name': obj.user.last_name or '',
                'email': obj.user.email or ''
            }
        return None


class AppDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for app with reviews"""
    approved_reviews = serializers.SerializerMethodField()
    approved_reviews_count = serializers.SerializerMethodField()
    
    class Meta:
        model = App
        fields = [
            'id', 'name', 'description', 'developer', 'category',
            'version', 'app_store_url', 'google_play_url',
            'release_date', 'size_mb', 'average_rating', 'total_ratings',
            'tags', 'created_at', 'updated_at',
            'approved_reviews', 'approved_reviews_count'
        ]
    
    def get_approved_reviews_count(self, obj):
        return obj.get_approved_reviews_count()
    
    def get_approved_reviews(self, obj):
        approved_reviews = obj.reviews.filter(status='approved')
        return ReviewSummarySerializer(approved_reviews, many=True).data
    
    def to_representation(self, instance):
        """Custom representation to get approved reviews correctly"""
        data = super().to_representation(instance)
        
        # Get approved reviews manually to ensure correct filtering
        approved_reviews = Review.objects.filter(
            app=instance, 
            status='approved'
        ).select_related('user').order_by('-created_at')
        
        data['approved_reviews'] = ReviewSummarySerializer(
            approved_reviews, 
            many=True
        ).data
        
        return data


class AppCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new apps"""
    
    class Meta:
        model = App
        fields = [
            'name', 'description', 'developer', 'category',
            'version', 'app_store_url', 'google_play_url',
            'release_date', 'size_mb', 'tags'
        ]
    
    def validate_name(self, value):
        """Ensure app name is unique"""
        if App.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError("An app with this name already exists.")
        return value
