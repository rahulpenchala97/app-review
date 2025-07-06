from django.urls import path
from . import views

app_name = 'apps'

urlpatterns = [
    # App search and discovery
    path('search/suggestions/', views.app_search_suggestions, name='search_suggestions'),
    path('search/', views.app_search, name='search'),
    path('search/advanced/', views.app_search_advanced, name='search_advanced'),
    
    # App CRUD operations
    path('', views.app_list, name='list'),
    path('create/', views.app_create, name='create'),
    path('<int:app_id>/', views.app_detail, name='detail'),
    
    # Utility endpoints
    path('categories/', views.app_categories, name='categories'),
    path('developers/', views.app_developers, name='developers'),
]
