#!/usr/bin/env python3
"""
Test script for App Review API endpoints
"""
import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def test_endpoint(method, endpoint, data=None, headers=None, description=""):
    """Test an API endpoint"""
    url = f"{BASE_URL}{endpoint}"
    print(f"\n{'='*60}")
    print(f"Testing: {description}")
    print(f"URL: {method} {url}")
    
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers)
        elif method == 'POST':
            response = requests.post(url, json=data, headers=headers)
        elif method == 'PUT':
            response = requests.put(url, json=data, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        
        if response.headers.get('content-type', '').startswith('application/json'):
            response_data = response.json()
            print("Response:")
            print(json.dumps(response_data, indent=2))
        else:
            print("Response (non-JSON):")
            print(response.text[:500])
            
        return response
    except Exception as e:
        print(f"Error: {e}")
        return None

def main():
    """Run API tests"""
    print("🚀 Starting App Review API Tests")
    
    # Test 1: API Home
    test_endpoint('GET', '/', description="API Home")
    
    # Test 2: App List
    test_endpoint('GET', '/api/apps/', description="App List")
    
    # Test 3: App Search Suggestions
    test_endpoint('GET', '/api/apps/search/suggestions/?q=wha', description="Search Suggestions")
    
    # Test 4: App Full Search
    test_endpoint('GET', '/api/apps/search/?q=messaging', description="Full Search")
    
    # Test 5: App Categories
    test_endpoint('GET', '/api/apps/categories/', description="App Categories")
    
    # Test 6: App Detail
    test_endpoint('GET', '/api/apps/1/', description="App Detail")
    
    # Test 7: User Registration
    registration_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123",
        "password_confirm": "testpass123",
        "first_name": "Test",
        "last_name": "User"
    }
    response = test_endpoint('POST', '/api/auth/register/', data=registration_data, description="User Registration")
    
    # Get auth token for authenticated tests
    auth_token = None
    if response and response.status_code == 201:
        try:
            auth_token = response.json()['tokens']['access']
        except:
            pass
    
    if not auth_token:
        # Try login with existing user
        login_data = {"username": "admin", "password": "admin123"}
        response = test_endpoint('POST', '/api/auth/login/', data=login_data, description="Admin Login")
        if response and response.status_code == 200:
            try:
                auth_token = response.json()['tokens']['access']
            except:
                pass
    
    if auth_token:
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        # Test 8: User Profile
        test_endpoint('GET', '/api/users/profile/', headers=headers, description="User Profile")
        
        # Test 9: Create Review
        review_data = {
            "app": 1,
            "title": "Great app!",
            "content": "This is a test review. The app works really well!",
            "rating": 5,
            "tags": ["excellent", "recommended"]
        }
        test_endpoint('POST', '/api/reviews/create/', data=review_data, headers=headers, description="Create Review")
        
        # Test 10: My Reviews
        test_endpoint('GET', '/api/reviews/my-reviews/', headers=headers, description="My Reviews")
        
        # Test 11: Review Stats
        test_endpoint('GET', '/api/reviews/stats/', headers=headers, description="Review Stats")
        
        # Test 12: Pending Reviews (if supervisor)
        test_endpoint('GET', '/api/reviews/pending/', headers=headers, description="Pending Reviews (Supervisor)")
    
    print(f"\n{'='*60}")
    print("✅ API Tests Completed!")
    print("\nTo test the admin interface, visit: http://localhost:8000/admin/")
    print("Default admin credentials: admin / admin123")

if __name__ == "__main__":
    main()
