from django.contrib import admin
from .models import Review, ReviewApproval


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'app', 'rating', 'status', 'reviewed_by', 
        'reviewed_at', 'created_at'
    ]
    list_filter = [
        'status', 'rating', 'created_at', 'reviewed_at'
    ]
    search_fields = [
        'user__username', 'app__name', 'title', 'content'
    ]
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Review Content', {
            'fields': ('user', 'app', 'title', 'content', 'rating')
        }),
        ('Moderation', {
            'fields': ('status', 'reviewed_by', 'reviewed_at', 'rejection_reason')
        }),
        ('Engagement', {
            'fields': ('helpful_votes', 'total_votes'),
            'classes': ('collapse',)
        }),
        ('Extensibility', {
            'fields': ('sentiment_score', 'tags', 'metadata'),
            'classes': ('collapse',)
        }),
        ('System Fields', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'app', 'reviewed_by')
    
    actions = ['approve_reviews', 'reject_reviews', 'mark_pending']
    
    def approve_reviews(self, request, queryset):
        count = 0
        for review in queryset.filter(status='pending'):
            review.approve(request.user)
            count += 1
        self.message_user(request, f'{count} reviews approved.')
    approve_reviews.short_description = "Approve selected pending reviews"
    
    def reject_reviews(self, request, queryset):
        count = 0
        for review in queryset.filter(status='pending'):
            review.reject(request.user, "Rejected via admin")
            count += 1
        self.message_user(request, f'{count} reviews rejected.')
    reject_reviews.short_description = "Reject selected pending reviews"
    
    def mark_pending(self, request, queryset):
        queryset.update(status='pending', reviewed_by=None, reviewed_at=None)
        self.message_user(request, f'{queryset.count()} reviews marked as pending.')
    mark_pending.short_description = "Mark selected reviews as pending"


@admin.register(ReviewApproval)
class ReviewApprovalAdmin(admin.ModelAdmin):
    list_display = [
        'review', 'supervisor', 'decision', 'created_at'
    ]
    list_filter = [
        'decision', 'created_at'
    ]
    search_fields = [
        'review__user__username', 'review__app__name', 'supervisor__username'
    ]
    readonly_fields = ['created_at']

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('review', 'supervisor', 'review__app', 'review__user')
