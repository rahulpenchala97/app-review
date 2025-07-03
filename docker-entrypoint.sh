#!/bin/bash
set -e

# Wait for database
echo "Waiting for PostgreSQL..."
while ! pg_isready -h db -p 5432 -U postgres; do
  sleep 1
done

echo "PostgreSQL is ready!"

# Run migrations
python manage.py migrate

# Create superuser if it doesn't exist
python manage.py shell << EOF
from django.contrib.auth.models import User, Group
from django.db import IntegrityError

# Create superuser
try:
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
        print("Superuser created: admin/admin123")
except IntegrityError:
    print("Superuser already exists")

# Create supervisors group
supervisors_group, created = Group.objects.get_or_create(name='supervisors')
if created:
    print("Supervisors group created")
else:
    print("Supervisors group already exists")
EOF

# Load sample data
python manage.py loaddata fixtures/sample_data.json 2>/dev/null || echo "No sample data to load"

exec "$@"
