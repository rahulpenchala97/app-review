import csv
import os
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from django.db import transaction, models
from apps.models import App
from reviews.models import Review
from datetime import datetime
import re


class Command(BaseCommand):
    help = 'Import apps and reviews from Google Play Store CSV files'

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

    def handle(self, *args, **options):
        apps_file = options['apps_file']
        reviews_file = options['reviews_file']
        limit = options.get('limit')
        clear_existing = options.get('clear_existing', False)
        apps_only = options.get('apps_only', False)
        reviews_only = options.get('reviews_only', False)

        self.stdout.write(self.style.SUCCESS('🚀 Starting CSV import process...'))
        
        # Clear existing data if requested
        if clear_existing:
            self.clear_existing_data()
        
        # Import apps first (unless reviews-only)
        if not reviews_only:
            self.import_apps(apps_file, limit)
        
        # Then import reviews (unless apps-only)
        if not apps_only:
            self.import_reviews(reviews_file, limit)
            
            # No need to update ratings - they come directly from CSV
        
        self.stdout.write(self.style.SUCCESS('✅ CSV import completed successfully!'))

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
        from django.contrib.auth.models import User
        imported_users = User.objects.filter(username__startswith='user')
        imported_user_count = imported_users.count()
        imported_users.delete()
        self.stdout.write(f'Cleared {imported_user_count} imported users')
        
        self.stdout.write(self.style.SUCCESS('✅ Existing data cleared completely'))

    def import_apps(self, file_path, limit=None):
        """Import apps from CSV file"""
        self.stdout.write(f'📱 Importing apps from {file_path}...')
        
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f'File not found: {file_path}'))
            return
        
        apps_created = 0
        apps_updated = 0
        
        with open(file_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            for i, row in enumerate(reader):
                if limit and i >= limit:
                    break
                
                try:
                    with transaction.atomic():
                        app_data = self.parse_app_data(row)
                        app, created = App.objects.get_or_create(
                            name=app_data['name'],
                            defaults=app_data
                        )
                        
                        if created:
                            apps_created += 1
                        else:
                            # Update existing app with new data
                            for key, value in app_data.items():
                                setattr(app, key, value)
                            app.save()
                            apps_updated += 1
                        
                        if (i + 1) % 100 == 0:
                            self.stdout.write(f'Processed {i + 1} apps...')
                            
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f'Error processing app {row.get("App", "Unknown")}: {str(e)}')
                    )
                    continue
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ Apps import completed: {apps_created} created, {apps_updated} updated')
        )

    def import_reviews(self, file_path, limit=None):
        """Import reviews from CSV file"""
        self.stdout.write(f'📝 Importing reviews from {file_path}...')
        
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f'File not found: {file_path}'))
            return
        
        # Create or get multiple users for imported reviews to avoid unique constraint
        users = []
        for i in range(10):  # Create 10 users
            user, created = User.objects.get_or_create(
                username=f'user{i}',
                defaults={
                    'email': f'user{i}@example.com',
                    'first_name': f'User{i}',
                    'last_name': '',
                    'is_active': True
                }
            )
            users.append(user)
        
        reviews_created = 0
        reviews_skipped = 0
        user_index = 0
        
        with open(file_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            for i, row in enumerate(reader):
                if limit and i >= limit:
                    break
                
                try:
                    with transaction.atomic():
                        # Rotate through users to avoid unique constraint
                        current_user = users[user_index % len(users)]
                        user_index += 1
                        
                        review_data = self.parse_review_data(row, current_user)
                        
                        if not review_data:
                            reviews_skipped += 1
                            continue
                        
                        # Check if review already exists for this user and app
                        existing_review = Review.objects.filter(
                            app=review_data['app'],
                            user=current_user
                        ).first()
                        
                        if not existing_review:
                            Review.objects.create(**review_data)
                            reviews_created += 1
                        else:
                            # Try with next user
                            for alt_user in users:
                                if not Review.objects.filter(
                                    app=review_data['app'],
                                    user=alt_user
                                ).exists():
                                    review_data['user'] = alt_user
                                    Review.objects.create(**review_data)
                                    reviews_created += 1
                                    break
                            else:
                                reviews_skipped += 1
                        
                        if (i + 1) % 100 == 0:
                            self.stdout.write(f'Processed {i + 1} reviews...')
                            
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f'Error processing review for {row.get("App", "Unknown")}: {str(e)}')
                    )
                    continue
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ Reviews import completed: {reviews_created} created, {reviews_skipped} skipped')
        )

    def parse_app_data(self, row):
        """Parse app data from CSV row"""
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
        
        # Use app name as developer for now (CSV doesn't have separate developer field)
        developer = row.get('App', '').strip()[:200]
        
        return {
            'name': row.get('App', '').strip()[:200],  # Limit to model max_length
            'description': description,
            'developer': developer,
            'category': category,
            'version': row.get('Current Ver', '').strip()[:50],
            'size_mb': size_mb,
            'average_rating': rating,  # Use rating directly from CSV
            'total_ratings': reviews_count,  # Use review count directly from CSV
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

    def parse_review_data(self, row, default_user):
        """Parse review data from CSV row"""
        app_name = row.get('App', '').strip()
        review_text = row.get('Translated_Review', '').strip()
        sentiment = row.get('Sentiment', '').strip()
        sentiment_polarity = self.parse_float(row.get('Sentiment_Polarity', '0'))
        
        # Skip if essential data is missing
        if not app_name or not review_text or review_text.lower() == 'nan':
            return None
        
        # Find the app
        try:
            app = App.objects.get(name=app_name)
        except App.DoesNotExist:
            self.stdout.write(
                self.style.WARNING(f'App not found: {app_name}')
            )
            return None
        
        # Convert sentiment to rating (1-5 scale)
        rating = self.sentiment_to_rating(sentiment, sentiment_polarity)
        
        # Set all imported reviews as approved so they're visible in the frontend
        status = 'approved'
        
        return {
            'app': app,
            'user': default_user,
            'content': review_text[:1000],  # Limit content length
            'rating': rating,
            'status': status,
            'sentiment_score': sentiment_polarity,
            'metadata': {
                'sentiment': sentiment,
                'sentiment_polarity': sentiment_polarity,
                'sentiment_subjectivity': self.parse_float(row.get('Sentiment_Subjectivity', '0')),
                'imported_from': 'review_csv'
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
            # Remove commas and plus signs
            clean_value = str(value).replace(',', '').replace('+', '')
            return int(float(clean_value)) if clean_value and clean_value.lower() != 'nan' else 0
        except:
            return 0

    def parse_date(self, date_str):
        """Parse date string to datetime"""
        if not date_str:
            return None
        
        try:
            # Try different date formats
            formats = [
                '%B %d, %Y',  # January 7, 2018
                '%Y-%m-%d',   # 2018-01-07
                '%m/%d/%Y',   # 01/07/2018
            ]
            
            for fmt in formats:
                try:
                    naive_date = datetime.strptime(date_str, fmt)
                    # Convert to timezone-aware datetime
                    return timezone.make_aware(naive_date, timezone.get_current_timezone())
                except ValueError:
                    continue
            
            return None
        except:
            return None

    def sentiment_to_rating(self, sentiment, polarity):
        """Convert sentiment to 1-5 rating scale"""
        if sentiment.lower() == 'positive':
            # Positive sentiment: 4-5 stars based on polarity
            return 5 if polarity > 0.5 else 4
        elif sentiment.lower() == 'negative':
            # Negative sentiment: 1-2 stars based on polarity
            return 1 if polarity < -0.5 else 2
        else:
            # Neutral or unknown sentiment: 3 stars
            return 3
