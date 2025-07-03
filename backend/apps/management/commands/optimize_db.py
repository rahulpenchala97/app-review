import os
import django
from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Optimize database for large dataset'

    def handle(self, *args, **options):
        self.stdout.write('🚀 Optimizing database for large dataset...')
        
        with connection.cursor() as cursor:
            # Add indexes for better query performance
            indexes = [
                "CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category);",
                "CREATE INDEX IF NOT EXISTS idx_apps_rating ON apps(average_rating);",
                "CREATE INDEX IF NOT EXISTS idx_apps_name_search ON apps(name);",
                "CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);",
                "CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);",
                "CREATE INDEX IF NOT EXISTS idx_reviews_app_rating ON reviews(app_id, rating);",
                "ANALYZE;",  # Update SQLite statistics
            ]
            
            for index_sql in indexes:
                try:
                    cursor.execute(index_sql)
                    self.stdout.write(f'✅ Executed: {index_sql}')
                except Exception as e:
                    self.stdout.write(f'⚠️  Warning: {index_sql} - {e}')
        
        self.stdout.write(self.style.SUCCESS('✅ Database optimization complete!'))
