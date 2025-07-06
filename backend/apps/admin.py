from django.contrib import admin
from .models import App


@admin.register(App)
class AppAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'developer', 'category', 'average_rating', 
        'total_ratings', 'is_active', 'created_at'
    ]
    list_filter = [
        'category', 'is_active', 'created_at', 'average_rating'
    ]
    search_fields = ['name', 'developer', 'description']
    readonly_fields = ['created_at', 'updated_at', 'average_rating', 'total_ratings']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'developer', 'category', 'version')
        }),
        ('URLs and Identifiers', {
            'fields': ('app_store_url', 'google_play_url', 'app_id')
        }),
        ('Metadata', {
            'fields': ('release_date', 'last_updated', 'size_mb')
        }),
        ('Ratings', {
            'fields': ('average_rating', 'total_ratings'),
            'classes': ('collapse',)
        }),
        ('Extensibility', {
            'fields': ('tags', 'metadata'),
            'classes': ('collapse',)
        }),
        ('System Fields', {
            'fields': ('is_active', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('reviews')
    
    actions = ['activate_apps', 'deactivate_apps', 'update_ratings']
    
    def activate_apps(self, request, queryset):
        queryset.update(is_active=True)
        self.message_user(request, f'{queryset.count()} apps activated.')
    activate_apps.short_description = "Activate selected apps"
    
    def deactivate_apps(self, request, queryset):
        queryset.update(is_active=False)
        self.message_user(request, f'{queryset.count()} apps deactivated.')
    deactivate_apps.short_description = "Deactivate selected apps"
    
    def update_ratings(self, request, queryset):
        for app in queryset:
            app.update_average_rating()
        self.message_user(request, f'Ratings updated for {queryset.count()} apps.')
    update_ratings.short_description = "Update average ratings"
