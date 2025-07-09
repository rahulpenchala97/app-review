#!/bin/bash
set -e

echo "Starting Gunicorn..."
echo 'Waiting for database...'
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
    sleep 2
done
echo 'Database is ready!'

python manage.py migrate --noinput
python manage.py setup_data --skip-sample-data
echo 'Loading real Google Play Store data (FAST)'
python manage.py fast_import_csv
echo 'Setup complete!'

exec gunicorn app_review_project.wsgi:application --bind 0.0.0.0:8000
