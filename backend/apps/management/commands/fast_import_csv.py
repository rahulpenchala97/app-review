import csv
import os
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from django.db import transaction
from apps.models import App
from reviews.models import Review
from datetime import datetime
import re


class Command(BaseCommand):
    help = 'Fast import apps and reviews from Google Play Store CSV files using bulk operations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--apps-file',
            type=str,
            default='googleplaystore.csv',
            help='Path to the apps CSV file'
        )
        parser.add_argument(
            '--reviews-file',
            type=str,
            default='googleplaystore_user_reviews.csv',
            help='Path to the reviews CSV file'
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit number of records to import (for testing)'
        )
        parser.add_argument(
            '--clear-existing',
            action='store_true',
            help='Clear existing data before importing'
        )
        parser.add_argument(
            '--apps-only',
            action='store_true',
            help='Import only apps, skip reviews'
        )
        parser.add_argument(
            '--reviews-only',
            action='store_true',
            help='Import only reviews, skip apps'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Batch size for bulk operations (default: 1000)'
        )

    def handle(self, *args, **options):
        apps_file = options['apps_file']
        reviews_file = options['reviews_file']
        limit = options.get('limit')
        clear_existing = options.get('clear_existing', False)
        apps_only = options.get('apps_only', False)
        reviews_only = options.get('reviews_only', False)
        batch_size = options.get('batch_size', 1000)

        self.stdout.write(self.style.SUCCESS('🚀 Starting FAST CSV import process...'))
        
        # Clear existing data if requested
        if clear_existing:
            self.clear_existing_data()
        
        # Import apps first (unless reviews-only)
        if not reviews_only:
            self.fast_import_apps(apps_file, limit, batch_size)
        
        # Then import reviews (unless apps-only)
        if not apps_only:
            self.fast_import_reviews(reviews_file, limit, batch_size)
        
        self.stdout.write(self.style.SUCCESS('✅ FAST CSV import completed successfully!'))

    def clear_existing_data(self):
        """Clear existing apps and reviews data completely"""
        self.stdout.write('🗑️  Clearing existing data...')
        
        # Clear reviews first (due to foreign key constraints)
        review_count = Review.objects.count()
        Review.objects.all().delete()
        self.stdout.write(f'Cleared {review_count} reviews')
        
        # Clear apps
        app_count = App.objects.count()
        App.objects.all().delete()
        self.stdout.write(f'Cleared {app_count} apps')
        
        # Clear imported users (they will be recreated)
        imported_users = User.objects.filter(username__startswith='user')
        imported_user_count = imported_users.count()
        imported_users.delete()
        self.stdout.write(f'Cleared {imported_user_count} imported users')
        
        self.stdout.write(self.style.SUCCESS('✅ Existing data cleared completely'))

    def fast_import_apps(self, file_path, limit=None, batch_size=1000):
        """Fast import apps using bulk_create"""
        self.stdout.write(f'📱 Fast importing apps from {file_path}...')
        
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f'File not found: {file_path}'))
            return
        
        apps_to_create = []
        apps_created = 0
        apps_skipped = 0
        existing_app_names = set(App.objects.values_list('name', flat=True))
        
        with open(file_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            for i, row in enumerate(reader):
                if limit and i >= limit:
                    break
                
                try:
                    app_data = self.parse_app_data(row)
                    
                    # Skip if app already exists or invalid data
                    if not app_data or app_data['name'] in existing_app_names:
                        apps_skipped += 1
                        continue
                    
                    apps_to_create.append(App(**app_data))
                    existing_app_names.add(app_data['name'])  # Track to avoid duplicates in same batch
                    
                    # Bulk create when batch is full
                    if len(apps_to_create) >= batch_size:
                        App.objects.bulk_create(apps_to_create, ignore_conflicts=True)
                        apps_created += len(apps_to_create)
                        apps_to_create = []
                        self.stdout.write(f'Created {apps_created} apps...')
                        
                except Exception as e:
                    apps_skipped += 1
                    continue
        
        # Create remaining apps
        if apps_to_create:
            App.objects.bulk_create(apps_to_create, ignore_conflicts=True)
            apps_created += len(apps_to_create)
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ Fast apps import completed: {apps_created} created, {apps_skipped} skipped')
        )

    def fast_import_reviews(self, file_path, limit=None, batch_size=1000):
        """Fast import reviews using bulk_create"""
        self.stdout.write(f'📝 Fast importing reviews from {file_path}...')
        
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f'File not found: {file_path}'))
            return
        
        # Create users in bulk first
        self.stdout.write('Creating users for reviews...')
        users_to_create = []
        for i in range(100):  # Create 100 users for better distribution
            users_to_create.append(User(
                username=f'user{i}',
                email=f'user{i}@example.com',
                first_name=f'User{i}',
                last_name='',
                is_active=True
            ))
        
        # Use bulk_create with ignore_conflicts to handle existing users
        User.objects.bulk_create(users_to_create, ignore_conflicts=True)
        users = list(User.objects.filter(username__startswith='user').order_by('username'))
        self.stdout.write(f'Ready with {len(users)} users for reviews')
        
        # Cache all apps for faster lookup
        self.stdout.write('Caching apps for lookup...')
        app_cache = {app.name: app for app in App.objects.all()}
        self.stdout.write(f'Cached {len(app_cache)} apps')
        
        reviews_to_create = []
        reviews_created = 0
        reviews_skipped = 0
        user_app_combinations = set()
        
        with open(file_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            for i, row in enumerate(reader):
                if limit and i >= limit:
                    break
                
                try:
                    app_name = row.get('App', '').strip()
                    review_text = row.get('Translated_Review', '').strip()
                    sentiment = row.get('Sentiment', '').strip()
                    sentiment_polarity = self.parse_float(row.get('Sentiment_Polarity', '0'))
                    
                    # Skip if essential data is missing
                    if not app_name or not review_text or review_text.lower() == 'nan':
                        reviews_skipped += 1
                        continue
                    
                    # Get app from cache
                    app = app_cache.get(app_name)
                    if not app:
                        reviews_skipped += 1
                        continue
                    
                    # Find available user for this app
                    user = None
                    for u in users:
                        combo = (u.id, app.id)
                        if combo not in user_app_combinations:
                            user = u
                            user_app_combinations.add(combo)
                            break
                    
                    if not user:
                        reviews_skipped += 1
                        continue
                    
                    # Convert sentiment to rating
                    rating = self.sentiment_to_rating(sentiment, sentiment_polarity)
                    
                    reviews_to_create.append(Review(
                        app=app,
                        user=user,
                        content=review_text[:1000],
                        rating=rating,
                        status='approved',
                        sentiment_score=sentiment_polarity,
                        metadata={
                            'sentiment': sentiment,
                            'sentiment_polarity': sentiment_polarity,
                            'sentiment_subjectivity': self.parse_float(row.get('Sentiment_Subjectivity', '0')),
                            'imported_from': 'review_csv'
                        }
                    ))
                    
                    # Bulk create when batch is full
                    if len(reviews_to_create) >= batch_size:
                        Review.objects.bulk_create(reviews_to_create, ignore_conflicts=True)
                        reviews_created += len(reviews_to_create)
                        reviews_to_create = []
                        self.stdout.write(f'Created {reviews_created} reviews...')
                        
                except Exception as e:
                    reviews_skipped += 1
                    continue
        
        # Create remaining reviews
        if reviews_to_create:
            Review.objects.bulk_create(reviews_to_create, ignore_conflicts=True)
            reviews_created += len(reviews_to_create)
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ Fast reviews import completed: {reviews_created} created, {reviews_skipped} skipped')
        )

    def parse_app_data(self, row):
        """Parse app data from CSV row"""
        name = row.get('App', '').strip()[:200]
        if not name:
            return None
        
        # Clean and parse size
        size_str = row.get('Size', '').strip()
        size_mb = self.parse_size_to_mb(size_str)
        
        # Parse rating
        rating = self.parse_float(row.get('Rating', '0'))
        
        # Parse reviews count
        reviews_count = self.parse_int(row.get('Reviews', '0'))
        
        # Parse last updated date
        last_updated = self.parse_date(row.get('Last Updated', ''))
        
        # Parse category
        category = row.get('Category', '').strip()
        
        # Parse price
        price_str = row.get('Price', '0').strip()
        is_free = price_str == '0' or price_str.lower() == 'free'
        
        # Create a better description from available data
        description_parts = []
        if category:
            description_parts.append(f"Category: {category}")
        if row.get('Content Rating'):
            description_parts.append(f"Content Rating: {row.get('Content Rating')}")
        if row.get('Genres'):
            description_parts.append(f"Genres: {row.get('Genres')}")
        if row.get('Installs'):
            description_parts.append(f"Installs: {row.get('Installs')}")
        
        description = ". ".join(description_parts) if description_parts else "No description available"
        
        # Use app name as developer for now
        developer = name[:200]
        
        return {
            'name': name,
            'description': description,
            'developer': developer,
            'category': category,
            'version': row.get('Current Ver', '').strip()[:50],
            'size_mb': size_mb,
            'average_rating': rating,
            'total_ratings': reviews_count,
            'last_updated': last_updated,
            'metadata': {
                'installs': row.get('Installs', ''),
                'type': row.get('Type', ''),
                'price': row.get('Price', ''),
                'content_rating': row.get('Content Rating', ''),
                'genres': row.get('Genres', ''),
                'android_version': row.get('Android Ver', ''),
                'is_free': is_free,
                'imported_from': 'google_play_csv'
            }
        }

    def parse_size_to_mb(self, size_str):
        """Convert size string to MB"""
        if not size_str or size_str.lower() == 'varies with device':
            return None
        
        size_str = size_str.upper().replace(',', '')
        
        if 'K' in size_str:
            try:
                return float(re.findall(r'[\d.]+', size_str)[0]) / 1024
            except:
                return None
        elif 'M' in size_str:
            try:
                return float(re.findall(r'[\d.]+', size_str)[0])
            except:
                return None
        elif 'G' in size_str:
            try:
                return float(re.findall(r'[\d.]+', size_str)[0]) * 1024
            except:
                return None
        
        return None

    def parse_float(self, value):
        """Safely parse float value"""
        try:
            return float(value) if value and value.lower() != 'nan' else 0.0
        except:
            return 0.0

    def parse_int(self, value):
        """Safely parse integer value"""
        try:
            clean_value = str(value).replace(',', '').replace('+', '')
            return int(float(clean_value)) if clean_value and clean_value.lower() != 'nan' else 0
        except:
            return 0

    def parse_date(self, date_str):
        """Parse date string to datetime"""
        if not date_str:
            return None
        
        try:
            formats = [
                '%B %d, %Y',  # January 7, 2018
                '%Y-%m-%d',   # 2018-01-07
                '%m/%d/%Y',   # 01/07/2018
            ]
            
            for fmt in formats:
                try:
                    naive_date = datetime.strptime(date_str, fmt)
                    return timezone.make_aware(naive_date, timezone.get_current_timezone())
                except ValueError:
                    continue
            
            return None
        except:
            return None

    def sentiment_to_rating(self, sentiment, polarity):
        """Convert sentiment to 1-5 rating scale"""
        if sentiment.lower() == 'positive':
            return 5 if polarity > 0.5 else 4
        elif sentiment.lower() == 'negative':
            return 1 if polarity < -0.5 else 2
        else:
            return 3
