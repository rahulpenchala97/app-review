from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class Review(models.Model):
    """
    Model representing a user review for a mobile application.
    Designed to be extensible for future features like sentiment analysis,
    helpful votes, and moderation workflows.
    """
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    # Core fields
    app = models.ForeignKey('apps.App', on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    
    # Review content
    title = models.CharField(max_length=200, blank=True, null=True)
    content = models.TextField()
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating from 1 to 5 stars"
    )
    
    # Review status and moderation
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='moderated_reviews',
        help_text="Supervisor who approved/rejected this review"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)
    
    # Extensibility fields for future features
    sentiment_score = models.FloatField(
        null=True, 
        blank=True, 
        help_text="AI-generated sentiment score (-1 to 1)"
    )
    helpful_votes = models.IntegerField(default=0)
    total_votes = models.IntegerField(default=0)
    tags = models.JSONField(default=list, blank=True, help_text="Review tags for categorization")
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional metadata")
    
    # System fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'reviews'
        ordering = ['-created_at']
        unique_together = ['app', 'user']  # One review per user per app
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['rating']),
            models.Index(fields=['app', 'status']),
            models.Index(fields=['user']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.app.name} ({self.rating}★)"

    def approve(self, supervisor):
        """Approve the review by a supervisor"""
        self.status = 'approved'
        self.reviewed_by = supervisor
        self.reviewed_at = timezone.now()
        self.save()
        
        # Update app's average rating
        self.app.update_average_rating()

    def reject(self, supervisor, reason=None):
        """Reject the review by a supervisor"""
        self.status = 'rejected'
        self.reviewed_by = supervisor
        self.reviewed_at = timezone.now()
        if reason:
            self.rejection_reason = reason
        self.save()

    @property
    def helpfulness_ratio(self):
        """Calculate helpfulness ratio for future sorting"""
        if self.total_votes > 0:
            return self.helpful_votes / self.total_votes
        return 0.0

    @classmethod
    def get_pending_reviews(cls):
        """Get all pending reviews for supervisor review"""
        return cls.objects.filter(status='pending').select_related('app', 'user')

    @classmethod
    def get_approved_reviews_for_app(cls, app):
        """Get all approved reviews for a specific app"""
        return cls.objects.filter(
            app=app,
            status='approved'
        ).select_related('user').order_by('-created_at')
