from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group
from django.core.management import call_command
from django.db import transaction
from apps.models import App
from reviews.models import Review
import json
import os


class Command(BaseCommand):
    help = 'Set up initial data for the app review system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--skip-superuser',
            action='store_true',
            help='Skip creating superuser',
        )
        parser.add_argument(
            '--skip-sample-data',
            action='store_true',
            help='Skip loading sample data',
        )
        parser.add_argument(
            '--skip-test-users',
            action='store_true',
            help='Skip creating test users',
        )

    def handle(self, *args, **options):
        with transaction.atomic():
            self.stdout.write('Setting up App Review System...')
            
            # Create supervisors group
            self.create_supervisors_group()
            
            # Create superuser if requested
            if not options['skip_superuser']:
                self.create_superuser()
            
            # Create test users if requested
            if not options['skip_test_users']:
                self.create_test_users()

            # Load sample data if requested
            if not options['skip_sample_data']:
                self.load_sample_data()
            
            self.stdout.write(
                self.style.SUCCESS('Setup completed successfully!')
            )

    def create_supervisors_group(self):
        """Create supervisors group"""
        group, created = Group.objects.get_or_create(name='supervisors')
        if created:
            self.stdout.write('Created supervisors group')
        else:
            self.stdout.write('Supervisors group already exists')

    def create_superuser(self):
        """Create a superuser if none exists"""
        if not User.objects.filter(is_superuser=True).exists():
            admin_user = User.objects.create_superuser(
                username='admin',
                email='admin@example.com',
                password='admin123',
                first_name='Admin',
                last_name='User'
            )
            
            # Ensure the user is staff (should be automatic with create_superuser)
            admin_user.is_staff = True
            admin_user.save()

            # Add admin to supervisors group
            supervisors_group = Group.objects.get(name='supervisors')
            admin_user.groups.add(supervisors_group)
            
            self.stdout.write(
                self.style.SUCCESS(
                    'Created superuser: admin/admin123 (staff: %s, superuser: %s)' % (
                        admin_user.is_staff, admin_user.is_superuser
                    )
                )
            )
        else:
            # Check if existing superuser is in supervisors group
            admin_user = User.objects.filter(is_superuser=True).first()
            if admin_user:
                supervisors_group = Group.objects.get(name='supervisors')
                if not admin_user.groups.filter(name='supervisors').exists():
                    admin_user.groups.add(supervisors_group)
                    self.stdout.write(
                        'Added existing superuser to supervisors group')
            self.stdout.write('Superuser already exists')

    def create_test_users(self):
        """Create test users by calling the create_test_users command"""
        self.stdout.write('Creating test users...')
        try:
            call_command('create_test_users')
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to create test users: {e}')
            )

    def load_sample_data(self):
        """Load sample apps data"""
        sample_apps = [
            {
                'name': 'WhatsApp',
                'description': 'Simple. Reliable. Secure. WhatsApp from Meta is a FREE messaging and video calling app.',
                'developer': 'Meta Platforms',
                'category': 'Communication',
                'version': '2.23.24.76',
                'app_store_url': 'https://apps.apple.com/app/whatsapp-messenger/id310633997',
                'google_play_url': 'https://play.google.com/store/apps/details?id=com.whatsapp',
                'app_id': 'com.whatsapp',
                'size_mb': 85.2,
                'tags': ['messaging', 'communication', 'social'],
            },
            {
                'name': 'Instagram',
                'description': 'Create and share photos, stories, reels, videos & messages with friends & family.',
                'developer': 'Meta Platforms',
                'category': 'Photo & Video',
                'version': '302.0',
                'app_store_url': 'https://apps.apple.com/app/instagram/id389801252',
                'google_play_url': 'https://play.google.com/store/apps/details?id=com.instagram.android',
                'app_id': 'com.instagram.android',
                'size_mb': 128.5,
                'tags': ['social', 'photo', 'video', 'stories'],
            },
            {
                'name': 'Spotify',
                'description': 'Spotify is a digital music service that gives you access to millions of songs.',
                'developer': 'Spotify AB',
                'category': 'Music',
                'version': '8.8.50.749',
                'app_store_url': 'https://apps.apple.com/app/spotify-music-and-podcasts/id324684580',
                'google_play_url': 'https://play.google.com/store/apps/details?id=com.spotify.music',
                'app_id': 'com.spotify.music',
                'size_mb': 95.7,
                'tags': ['music', 'streaming', 'podcasts', 'audio'],
            },
            {
                'name': 'YouTube',
                'description': 'Get the official YouTube app on Android phones and tablets.',
                'developer': 'Google LLC',
                'category': 'Video Players & Editors',
                'version': '18.49.37',
                'app_store_url': 'https://apps.apple.com/app/youtube-watch-listen-stream/id544007664',
                'google_play_url': 'https://play.google.com/store/apps/details?id=com.google.android.youtube',
                'app_id': 'com.google.android.youtube',
                'size_mb': 156.3,
                'tags': ['video', 'streaming', 'entertainment', 'education'],
            },
            {
                'name': 'Gmail',
                'description': 'Gmail is an easy to use email app that saves you time and keeps your messages safe.',
                'developer': 'Google LLC',
                'category': 'Productivity',
                'version': '2023.11.26.584072612',
                'app_store_url': 'https://apps.apple.com/app/gmail-email-by-google/id422689480',
                'google_play_url': 'https://play.google.com/store/apps/details?id=com.google.android.gm',
                'app_id': 'com.google.android.gm',
                'size_mb': 78.9,
                'tags': ['email', 'productivity', 'communication', 'google'],
            }
        ]
        
        created_count = 0
        for app_data in sample_apps:
            app, created = App.objects.get_or_create(
                name=app_data['name'],
                defaults=app_data
            )
            if created:
                created_count += 1
        
        self.stdout.write(f'Created {created_count} sample apps')
        self.stdout.write(f'Total apps in database: {App.objects.count()}')
