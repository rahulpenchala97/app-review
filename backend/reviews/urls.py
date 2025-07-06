from django.urls import path
from . import views

app_name = 'reviews'

urlpatterns = [
    # Review CRUD operations
    path('create/', views.review_create, name='create'),
    path('my-reviews/', views.review_list_user, name='user_reviews'),
    path('<int:review_id>/', views.review_detail, name='detail'),
    
    # Review moderation (supervisor only)
    path('pending/', views.pending_reviews, name='pending'),
    path('moderation/', views.reviews_for_moderation, name='moderation'),
    path('<int:review_id>/moderate/', views.review_moderate, name='moderate'),
    path('<int:review_id>/supervisor-decision/',
         views.supervisor_review_decision, name='supervisor_decision'),

    # Conflict resolution (superuser only)
    path('conflicted/', views.conflicted_reviews, name='conflicted'),
    path('<int:review_id>/resolve-conflict/',
         views.resolve_conflict, name='resolve_conflict'),
    
    # Admin override (superuser only)
    path('<int:review_id>/admin-override/',
         views.admin_override_review, name='admin_override'),

    # Statistics
    path('stats/', views.review_stats, name='stats'),
    path('supervisor-stats/', views.supervisor_stats, name='supervisor_stats'),

    # Detailed supervisor decisions
    path('<int:review_id>/supervisor-decisions/',
         views.review_supervisor_decisions, name='review_supervisor_decisions'),
]
