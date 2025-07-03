from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    """
    Extended user profile for additional user information.
    Designed to be extensible for future features like user preferences,
    reputation systems, and advanced user management.
    """
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # User preferences and settings
    email_notifications = models.BooleanField(default=True)
    review_notifications = models.BooleanField(default=True)
    
    # Profile information
    bio = models.TextField(blank=True, null=True, max_length=500)
    avatar = models.URLField(blank=True, null=True)
    location = models.CharField(max_length=100, blank=True, null=True)
    
    # Reputation and activity metrics (for future gamification)
    reputation_score = models.IntegerField(default=0)
    total_reviews = models.IntegerField(default=0)
    helpful_review_count = models.IntegerField(default=0)
    
    # Extensibility fields
    preferences = models.JSONField(default=dict, blank=True, help_text="User preferences and settings")
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional user metadata")
    
    # System fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_profiles'
        
    def __str__(self):
        return f"{self.user.username}'s Profile"
    
    def update_review_stats(self):
        """Update user's review statistics"""
        from reviews.models import Review
        
        user_reviews = Review.objects.filter(user=self.user)
        self.total_reviews = user_reviews.count()
        
        # Count approved reviews that have received helpful votes
        self.helpful_review_count = user_reviews.filter(
            status='approved',
            helpful_votes__gt=0
        ).count()
        
        # Calculate reputation based on approved reviews and helpful votes
        approved_reviews = user_reviews.filter(status='approved')
        total_helpful_votes = sum([review.helpful_votes for review in approved_reviews])
        self.reputation_score = (approved_reviews.count() * 10) + (total_helpful_votes * 5)
        
        self.save(update_fields=['total_reviews', 'helpful_review_count', 'reputation_score'])

    @property
    def is_supervisor(self):
        """Check if user is in supervisors group"""
        return self.user.groups.filter(name='supervisors').exists()

    @property
    def can_moderate_reviews(self):
        """Check if user can moderate reviews"""
        return self.is_supervisor or self.user.is_staff


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create user profile when user is created"""
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Save user profile when user is saved"""
    if hasattr(instance, 'profile'):
        instance.profile.save()
