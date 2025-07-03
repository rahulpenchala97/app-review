from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import UserProfile


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'
    readonly_fields = ['reputation_score', 'total_reviews', 'helpful_review_count', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Profile Information', {
            'fields': ('bio', 'avatar', 'location')
        }),
        ('Preferences', {
            'fields': ('email_notifications', 'review_notifications')
        }),
        ('Statistics', {
            'fields': ('reputation_score', 'total_reviews', 'helpful_review_count'),
            'classes': ('collapse',)
        }),
        ('Extensibility', {
            'fields': ('preferences', 'metadata'),
            'classes': ('collapse',)
        }),
        ('System Fields', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class ExtendedUserAdmin(UserAdmin):
    inlines = (UserProfileInline,)
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('profile')


# Unregister the default User admin and register our extended version
admin.site.unregister(User)
admin.site.register(User, ExtendedUserAdmin)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'reputation_score', 'total_reviews', 
        'helpful_review_count', 'email_notifications', 'created_at'
    ]
    list_filter = [
        'email_notifications', 'review_notifications', 'created_at'
    ]
    search_fields = ['user__username', 'user__email', 'bio', 'location']
    readonly_fields = ['reputation_score', 'total_reviews', 'helpful_review_count', 'created_at', 'updated_at']
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Profile Information', {
            'fields': ('bio', 'avatar', 'location')
        }),
        ('Preferences', {
            'fields': ('email_notifications', 'review_notifications')
        }),
        ('Statistics', {
            'fields': ('reputation_score', 'total_reviews', 'helpful_review_count'),
            'classes': ('collapse',)
        }),
        ('Extensibility', {
            'fields': ('preferences', 'metadata'),
            'classes': ('collapse',)
        }),
        ('System Fields', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')
    
    actions = ['update_user_stats']
    
    def update_user_stats(self, request, queryset):
        for profile in queryset:
            profile.update_review_stats()
        self.message_user(request, f'Statistics updated for {queryset.count()} user profiles.')
    update_user_stats.short_description = "Update user statistics"
