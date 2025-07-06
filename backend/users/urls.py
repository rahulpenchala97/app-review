from django.urls import path
from . import views

app_name = 'users'

urlpatterns = [
    # Authentication
    path('register/', views.user_register, name='register'),
    path('login/', views.user_login, name='login'),
    
    # Profile management
    path('profile/', views.user_profile, name='profile'),
    path('profile/update/', views.user_profile_update, name='profile_update'),
    path('profile/refresh-stats/', views.refresh_user_stats, name='refresh_stats'),
    path('change-password/', views.change_password, name='change_password'),
    
    # User management (admin/supervisor only)
    path('list/', views.user_list, name='list'),
    path('supervisors/', views.supervisor_list, name='supervisor_list'),
    path('promote-supervisor/', views.promote_to_supervisor, name='promote_supervisor'),
    path('bulk-promote-supervisors/', views.bulk_promote_supervisors,
         name='bulk_promote_supervisors'),
    path('<int:user_id>/revoke-supervisor/', views.revoke_supervisor, name='revoke_supervisor'),
]
