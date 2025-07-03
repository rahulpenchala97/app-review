from django.db import models
from django.core.validators import URLValidator
from django.utils import timezone


class App(models.Model):
    """
    Model representing a mobile application.
    Designed to be extensible for future features like tagging and categories.
    """
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True, null=True)
    developer = models.CharField(max_length=200, blank=True, null=True)
    category = models.CharField(max_length=100, blank=True, null=True)
    version = models.CharField(max_length=50, blank=True, null=True)
    
    # URLs and identifiers
    app_store_url = models.URLField(blank=True, null=True, validators=[URLValidator()])
    google_play_url = models.URLField(blank=True, null=True, validators=[URLValidator()])
    app_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    
    # Metadata
    release_date = models.DateField(blank=True, null=True)
    last_updated = models.DateTimeField(blank=True, null=True)
    size_mb = models.FloatField(blank=True, null=True, help_text="App size in MB")
    
    # Ratings (can be populated from app stores)
    average_rating = models.FloatField(default=0.0, help_text="Average rating from all sources")
    total_ratings = models.IntegerField(default=0)
    
    # Extensibility fields for future features
    tags = models.JSONField(default=list, blank=True, help_text="JSON list of tags for categorization")
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional metadata for future extensions")
    
    # System fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'apps'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['category']),
            models.Index(fields=['developer']),
            models.Index(fields=['average_rating']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.developer or 'Unknown Developer'})"

    def get_approved_reviews_count(self):
        """Get count of approved reviews for this app"""
        return self.reviews.filter(status='approved').count()

    def update_average_rating(self):
        """Update average rating based on approved reviews"""
        from reviews.models import Review
        approved_reviews = Review.objects.filter(app=self, status='approved')
        if approved_reviews.exists():
            avg_rating = approved_reviews.aggregate(
                avg=models.Avg('rating')
            )['avg']
            self.average_rating = round(avg_rating, 2) if avg_rating else 0.0
            self.total_ratings = approved_reviews.count()
        else:
            self.average_rating = 0.0
            self.total_ratings = 0
        self.save(update_fields=['average_rating', 'total_ratings'])

    @classmethod
    def search_by_name(cls, query, limit=10):
        """
        Search apps by name using icontains.
        Used for auto-suggestions after 3 characters.
        """
        return cls.objects.filter(
            name__icontains=query,
            is_active=True
        ).order_by('name')[:limit]
