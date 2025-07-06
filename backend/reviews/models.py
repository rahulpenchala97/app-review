from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.contrib.auth.models import Group



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
        ('conflict', 'Conflict - Admin Review Required'),
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

    def get_approval_summary(self):
        """Get approval summary for this review"""
        # For approved/rejected reviews that are finalized, don't calculate pending counts
        # But for conflict status, we need to show the actual vote counts
        if self.status in ['approved', 'rejected']:
            return {
                'total_supervisors': 0,
                'approved': 0,
                'rejected': 0,
                'pending': 0,
            }

        # Calculate for pending reviews and conflict reviews
        approvals = self.approvals.all()
        approved_count = approvals.filter(decision='approved').count()
        rejected_count = approvals.filter(decision='rejected').count()

        # Get total number of supervisors
        supervisors_group = Group.objects.get(name='supervisors')
        total_supervisors = supervisors_group.user_set.count()

        return {
            'total_supervisors': total_supervisors,
            'approved': approved_count,
            'rejected': rejected_count,
            'pending': total_supervisors - approved_count - rejected_count,
        }

    def get_supervisor_decision(self, supervisor):
        """Get the decision of a specific supervisor for this review"""
        try:
            approval = self.approvals.get(supervisor=supervisor)
            return approval.decision
        except ReviewApproval.DoesNotExist:
            return 'pending'

    def clear_supervisor_approvals(self):
        """Clear all supervisor approvals for this review (used when review is edited)"""
        self.approvals.all().delete()

    def check_and_finalize_status(self):
        """Check if review should be finalized based on supervisor decisions"""
        summary = self.get_approval_summary()

        # Check if all supervisors have voted
        total_decisions = summary['approved'] + summary['rejected']
        all_voted = total_decisions == summary['total_supervisors']

        # Simple majority rule: if more than half of supervisors approve, approve the review
        # If more than half reject, reject the review
        # If there's a tie and all have voted, mark as conflict
        majority_threshold = summary['total_supervisors'] // 2 + 1

        if summary['approved'] >= majority_threshold:
            self.status = 'approved'
            self.reviewed_at = timezone.now()
            # Set reviewed_by to the latest approving supervisor
            latest_approval = self.approvals.filter(
                decision='approved').order_by('-created_at').first()
            if latest_approval:
                self.reviewed_by = latest_approval.supervisor
            self.save()
            if hasattr(self, 'app'):
                self.app.update_average_rating()
            return 'approved'
        elif summary['rejected'] >= majority_threshold:
            self.status = 'rejected'
            self.reviewed_at = timezone.now()
            # Set reviewed_by to the latest rejecting supervisor and get rejection reason
            latest_rejection = self.approvals.filter(
                decision='rejected').order_by('-created_at').first()
            if latest_rejection:
                self.reviewed_by = latest_rejection.supervisor
                if latest_rejection.comments:
                    self.rejection_reason = latest_rejection.comments
            self.save()
            return 'rejected'
        elif all_voted and summary['approved'] == summary['rejected']:
            # Conflict: equal number of approvals and rejections
            self.status = 'conflict'
            self.reviewed_at = timezone.now()
            self.save()

            # Trigger notification to admin and all supervisors about conflict
            self._notify_conflict()
            return 'conflict'

        return 'pending'

    def _notify_conflict(self):
        """Notify admin and supervisors about a conflict requiring admin resolution"""
        from django.contrib.auth.models import Group
        from django.core.mail import send_mail
        from django.conf import settings

        try:
            # Get admin users and supervisors
            admin_group = Group.objects.get(name='admins')
            supervisor_group = Group.objects.get(name='supervisors')

            admin_emails = list(admin_group.user_set.values_list(
                'email', flat=True).filter(email__isnull=False))
            supervisor_emails = list(supervisor_group.user_set.values_list(
                'email', flat=True).filter(email__isnull=False))

            all_emails = list(set(admin_emails + supervisor_emails))

            if all_emails:
                subject = f'Review Conflict Requires Admin Resolution - Review #{self.id}'
                message = f"""
A review conflict has occurred and requires admin resolution.

Review Details:
- Review ID: {self.id}
- App: {self.app.name}
- User: {self.user.username}
- Title: {self.title or 'No title'}
- Content: {self.content[:200]}{'...' if len(self.content) > 200 else ''}

Conflict Details:
- Equal number of approvals and rejections from supervisors
- Total supervisors: {self.get_approval_summary()['total_supervisors']}
- Approvals: {self.get_approval_summary()['approved']}
- Rejections: {self.get_approval_summary()['rejected']}

Please review this case manually in the admin panel or conflict resolution page.

Review URL: {getattr(settings, 'BASE_URL', 'http://localhost:3000')}/conflict-resolution

Best regards,
App Review System
                """

                # Send email notification
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=getattr(
                        settings, 'DEFAULT_FROM_EMAIL', 'noreply@appreview.com'),
                    recipient_list=all_emails,
                    fail_silently=True
                )
        except Exception as e:
            # Log the error but don't fail the review process
            import logging
            logger = logging.getLogger(__name__)
            logger.error(
                f"Failed to send conflict notification for review {self.id}: {str(e)}")


class ReviewApproval(models.Model):
    """
    Tracks individual supervisor decisions on reviews.
    Allows multiple supervisors to vote before finalizing a review.
    """

    DECISION_CHOICES = [
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    review = models.ForeignKey(
        'Review', on_delete=models.CASCADE, related_name='approvals')
    supervisor = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='review_decisions')
    decision = models.CharField(max_length=20, choices=DECISION_CHOICES)
    comments = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # One decision per supervisor per review
        unique_together = ['review', 'supervisor']
        indexes = [
            models.Index(fields=['review']),
            models.Index(fields=['supervisor']),
            models.Index(fields=['decision']),
        ]

    def __str__(self):
        return f"{self.supervisor.username} - {self.review.id} - {self.decision}"
