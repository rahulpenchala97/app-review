from django.core.management.base import BaseCommand
from reviews.models import Review


class Command(BaseCommand):
    help = 'Test approval summary for reviews with different statuses'

    def add_arguments(self, parser):
        parser.add_argument('--review-id', type=int, help='Test specific review ID')

    def handle(self, *args, **options):
        review_id = options.get('review_id')
        
        if review_id:
            try:
                review = Review.objects.get(id=review_id)
                self.test_single_review(review)
            except Review.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Review {review_id} not found'))
        else:
            # Test all reviews
            reviews = Review.objects.all()[:10]  # Limit to first 10
            for review in reviews:
                self.test_single_review(review)

    def test_single_review(self, review):
        self.stdout.write(f"\nReview ID: {review.id}")
        self.stdout.write(f"Status: {review.status}")
        self.stdout.write(f"App: {review.app.name}")
        self.stdout.write(f"User: {review.user.username}")
        
        try:
            approval_summary = review.get_approval_summary()
            self.stdout.write(f"Approval Summary: {approval_summary}")
            
            if approval_summary['pending'] < 0:
                self.stdout.write(self.style.ERROR("❌ NEGATIVE PENDING COUNT DETECTED!"))
            else:
                self.stdout.write(self.style.SUCCESS("✅ Approval summary looks good"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error getting approval summary: {e}"))
        
        self.stdout.write("-" * 50)
