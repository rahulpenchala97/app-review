from django.db import models
from django.core.validators import URLValidator
from django.utils import timezone
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank, TrigramSimilarity
from django.contrib.postgres.indexes import GinIndex
from django.db.models import Q, F
from django.db.models.functions import Greatest


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
            # PostgreSQL full-text search indexes
            GinIndex(
                fields=['name'],
                name='apps_name_gin_idx',
                opclasses=['gin_trgm_ops']
            ),
            GinIndex(
                fields=['description'],
                name='apps_description_gin_idx',
                opclasses=['gin_trgm_ops']
            ),
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

    @classmethod
    def search_fulltext(cls, query, min_rank=0.1):
        """
        Advanced full-text search with ranking.
        Searches across name, description, developer, and category fields.
        Returns results ordered by relevance.
        """
        if not query or not query.strip():
            return cls.objects.none()

        query = query.strip()

        # Create search vectors with weights
        search_vector = (
            SearchVector('name', weight='A', config='english') +
            SearchVector('developer', weight='B', config='english') +
            SearchVector('category', weight='C', config='english') +
            SearchVector('description', weight='D', config='english')
        )

        search_query = SearchQuery(query, config='english')

        return cls.objects.annotate(
            search=search_vector,
            rank=SearchRank(search_vector, search_query)
        ).filter(
            search=search_query,
            is_active=True,
            rank__gte=min_rank
        ).order_by('-rank', '-average_rating')

    @classmethod
    def search_fuzzy(cls, query, min_similarity=0.3):
        """
        Fuzzy search using trigram similarity.
        Useful for handling typos and partial matches.
        """
        if not query or not query.strip():
            return cls.objects.none()

        query = query.strip()

        return cls.objects.annotate(
            name_similarity=TrigramSimilarity('name', query),
            developer_similarity=TrigramSimilarity('developer', query),
            category_similarity=TrigramSimilarity('category', query),
            description_similarity=TrigramSimilarity('description', query),
        ).annotate(
            max_similarity=Greatest(
                'name_similarity',
                'developer_similarity',
                'category_similarity',
                'description_similarity'
            )
        ).filter(
            max_similarity__gt=min_similarity,
            is_active=True
        ).order_by('-max_similarity', '-average_rating')

    @classmethod
    def advanced_search(cls, query, category=None, min_rank=0.1, min_similarity=0.3, use_fuzzy=True):
        """
        Comprehensive search that combines full-text search with fuzzy fallback.
        """
        if not query or not query.strip():
            if category:
                # Category-only search
                return cls.objects.filter(
                    category__iexact=category,
                    is_active=True
                ).order_by('-average_rating', 'name'), 'category_filter'
            return cls.objects.none(), 'no_query'

        # Start with full-text search
        base_queryset = cls.search_fulltext(query, min_rank)

        # Apply category filter if provided
        if category:
            base_queryset = base_queryset.filter(category__iexact=category)

        if base_queryset.exists():
            return base_queryset, 'fulltext'

        # Fallback to fuzzy search if no full-text results
        if use_fuzzy:
            fuzzy_queryset = cls.search_fuzzy(query, min_similarity)
            if category:
                fuzzy_queryset = fuzzy_queryset.filter(
                    category__iexact=category)

            if fuzzy_queryset.exists():
                return fuzzy_queryset, 'fuzzy'

        # Final fallback to basic icontains search
        fallback_filter = models.Q(name__icontains=query) | models.Q(
            description__icontains=query)
        fallback_queryset = cls.objects.filter(fallback_filter, is_active=True)

        if category:
            fallback_queryset = fallback_queryset.filter(
                category__iexact=category)

        return fallback_queryset.order_by('-average_rating', 'name'), 'fallback'
