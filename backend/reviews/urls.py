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
    path('<int:review_id>/moderate/', views.review_moderate, name='moderate'),
    
    # Statistics
    path('stats/', views.review_stats, name='stats'),
    path('supervisor-stats/', views.supervisor_stats, name='supervisor_stats'),
]
