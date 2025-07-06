from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction

User = get_user_model()


class Command(BaseCommand):
    help = 'Create default test users: user1-user10 (normal), sup1-sup3 (supervisors), admin (superuser)'

    def handle(self, *args, **options):
        with transaction.atomic():
            self.stdout.write('Creating default test users...')
            
            # Get or create supervisors group
            supervisors_group, created = Group.objects.get_or_create(name='supervisors')
            if created:
                self.stdout.write('Created supervisors group')
            
            # Create normal users (user1 to user10)
            normal_users_created = 0
            for i in range(1, 11):
                username = f'user{i}'
                email = f'user{i}@example.com'
                
                if not User.objects.filter(username=username).exists():
                    user = User.objects.create_user(
                        username=username,
                        email=email,
                        password='admin123',
                        first_name=f'User',
                        last_name=f'{i}',
                        is_superuser=False,
                        is_staff=False
                    )
                    normal_users_created += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Created normal user: {username}')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'- User {username} already exists')
                    )
            
            # Create supervisor users (sup1 to sup3)
            supervisors_created = 0
            for i in range(1, 4):
                username = f'sup{i}'
                email = f'sup{i}@example.com'
                
                if not User.objects.filter(username=username).exists():
                    user = User.objects.create_user(
                        username=username,
                        email=email,
                        password='admin123',
                        first_name=f'Supervisor',
                        last_name=f'{i}',
                        is_superuser=False,
                        is_staff=True  # Supervisors get staff access
                    )
                    # Add user to supervisors group
                    user.groups.add(supervisors_group)
                    supervisors_created += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Created supervisor: {username}')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'- Supervisor {username} already exists')
                    )
            
            # Create admin user (if not exists)
            admin_created = False
            if not User.objects.filter(username='admin').exists():
                admin_user = User.objects.create_user(
                    username='admin',
                    email='admin@example.com',
                    password='admin123',
                    first_name='Admin',
                    last_name='User',
                    is_superuser=True,
                    is_staff=True
                )
                # Add admin to supervisors group
                admin_user.groups.add(supervisors_group)
                admin_created = True
                self.stdout.write(
                    self.style.SUCCESS('✓ Created admin user: admin')
                )
            else:
                self.stdout.write(
                    self.style.WARNING('- Admin user already exists')
                )
            
            # Summary
            self.stdout.write('\n' + '='*50)
            self.stdout.write(self.style.SUCCESS('SUMMARY:'))
            self.stdout.write(f'Normal users created: {normal_users_created}/10')
            self.stdout.write(f'Supervisors created: {supervisors_created}/3')
            self.stdout.write(f'Admin created: {"Yes" if admin_created else "Already exists"}')
            self.stdout.write('\nAll users have password: admin123')
            self.stdout.write('='*50)
