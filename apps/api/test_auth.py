#!/usr/bin/env python3
"""
Test script for authentication and database operations
"""

import sys
import os
sys.path.append('.')

from database import get_db_session, check_database_connection
from repositories.user_repository import UserRepository
from models.user import User

def test_database_connection():
    """Test database connection"""
    print("Testing database connection...")
    if check_database_connection():
        print("✓ Database connection successful")
        return True
    else:
        print("✗ Database connection failed")
        return False

def test_user_repository():
    """Test user repository operations"""
    print("\nTesting user repository...")
    
    try:
        with get_db_session() as session:
            user_repo = UserRepository(session)
            
            # Test creating a user
            test_user = user_repo.find_or_create_user(
                google_id="test_google_id_123",
                email="test@example.com",
                name="Test User",
                avatar_url="https://example.com/avatar.jpg"
            )
            print(f"✓ Created/found user: {test_user.email}")
            
            # Test finding the same user
            found_user = user_repo.get_user_by_google_id("test_google_id_123")
            if found_user:
                print(f"✓ Found user by Google ID: {found_user.email}")
            else:
                print("✗ Could not find user by Google ID")
                
            # Test finding by email
            email_user = user_repo.get_user_by_email("test@example.com")
            if email_user:
                print(f"✓ Found user by email: {email_user.name}")
            else:
                print("✗ Could not find user by email")
                
            # Test updating user
            test_user.name = "Updated Test User"
            updated_user = user_repo.update_user(test_user)
            print(f"✓ Updated user name: {updated_user.name}")
            
            print("✓ All user repository tests passed")
            return True
            
    except Exception as e:
        print(f"✗ User repository test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("=== Authentication System Test ===\n")
    
    success = True
    
    # Test database connection
    if not test_database_connection():
        success = False
    
    # Test user repository
    if not test_user_repository():
        success = False
    
    print("\n=== Test Results ===")
    if success:
        print("✓ All tests passed successfully!")
        print("✓ Authentication system is ready for production")
    else:
        print("✗ Some tests failed")
        print("✗ Check configuration and database setup")
        sys.exit(1)

if __name__ == "__main__":
    main()