# CSV Data Import for App Review System

This document explains how to import data from Google Play Store CSV files into the app review system.

## 📁 CSV Files Required

The system expects two CSV files:
1. `googleplaystore.csv` - Contains app information
2. `googleplaystore_user_reviews.csv` - Contains user reviews

## 🚀 Usage

### Basic Import
```bash
# Import both apps and reviews (recommended)
python manage.py import_csv_data

# Import with limit (for testing)
python manage.py import_csv_data --limit 1000
```

### Advanced Options
```bash
# Clear existing data before importing
python manage.py import_csv_data --clear-existing

# Import only apps
python manage.py import_csv_data --apps-only

# Import only reviews
python manage.py import_csv_data --reviews-only

# Specify custom file paths
python manage.py import_csv_data --apps-file /path/to/apps.csv --reviews-file /path/to/reviews.csv
```

### Full Import (Production)
```bash
# Import all data (this may take several minutes)
python manage.py import_csv_data --clear-existing
```

## 📊 Data Mapping

### Apps CSV Structure
The command maps CSV columns to model fields:
- `App` → `name`
- `Category` → `category`
- `Rating` → `average_rating`
- `Reviews` → `total_ratings`
- `Size` → `size_mb`
- `Last Updated` → `last_updated`
- `Current Ver` → `version`
- Additional fields stored in `metadata`

### Reviews CSV Structure
The command maps CSV columns to model fields:
- `App` → Links to app by name
- `Translated_Review` → `content`
- `Sentiment` → Converted to 1-5 rating scale
- `Sentiment_Polarity` → `sentiment_score`
- Additional fields stored in `metadata`

## 🔧 Features

### Smart Data Processing
- **Size parsing**: Converts "1.5M", "500K", "2.5G" to MB
- **Date parsing**: Handles various date formats
- **Rating conversion**: Converts sentiment to 1-5 star ratings
- **Duplicate handling**: Prevents duplicate reviews per app/user

### User Management
- Creates multiple CSV users to avoid unique constraint issues
- Automatically assigns reviews to different users
- Preserves original sentiment and metadata

### Error Handling
- Continues processing even if individual records fail
- Logs warnings for problematic records
- Provides detailed progress feedback

## 📈 Expected Results

### Apps
- **Total apps in dataset**: ~10,000+ apps
- **Categories**: Various (Games, Productivity, Social, etc.)
- **Metadata**: Install counts, content ratings, genres, etc.

### Reviews
- **Total reviews**: ~64,000+ reviews
- **Sentiment analysis**: Positive, Negative, Neutral
- **Ratings**: Converted from sentiment to 1-5 stars
- **Multiple users**: Reviews distributed across CSV users

## 🛠️ Troubleshooting

### Common Issues

1. **File not found**
   ```bash
   # Make sure CSV files are in the backend directory
   ls -la googleplaystore*.csv
   ```

2. **Memory issues with large imports**
   ```bash
   # Use smaller limits for testing
   python manage.py import_csv_data --limit 500
   ```

3. **Database errors**
   ```bash
   # Clear existing data if needed
   python manage.py import_csv_data --clear-existing
   ```

### Performance Tips
- Use `--limit` for testing and development
- Run imports during off-peak hours
- Monitor database size and performance
- Consider using PostgreSQL for better performance

## 📝 Example Output

```
🚀 Starting CSV import process...
📱 Importing apps from googleplaystore.csv...
Processed 100 apps...
Processed 200 apps...
...
✅ Apps import completed: 1222 created, 0 updated
📝 Importing reviews from googleplaystore_user_reviews.csv...
Processed 100 reviews...
Processed 200 reviews...
...
✅ Reviews import completed: 850 created, 150 skipped
✅ CSV import completed successfully!
```

## 🎯 Next Steps

After importing:
1. **Update search indexes** if using search functionality
2. **Verify data quality** using Django admin or API
3. **Test frontend** with real data
4. **Set up periodic imports** if needed

The imported data provides a rich foundation for testing and demonstrating the app review system with real-world data from Google Play Store.
