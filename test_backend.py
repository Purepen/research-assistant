import requests
import json
import time
import tempfile
import os

# YOUR CORRECT BASE URL - NO /api PREFIX!
BASE_URL = 'http://localhost:8000'

class BackendTester:
    def __init__(self):
        self.token = None
        self.test_email = f'test_{int(time.time())}@example.com'
        self.test_password = 'TestPass123!'
        self.project_id = None
        
    def print_response(self, title, response):
        """Pretty print API responses"""
        print(f"\n{'='*60}")
        print(f"🧪 TEST: {title}")
        print(f"{'='*60}")
        print(f"Status Code: {response.status_code}")
        try:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        except:
            print(f"Response: {response.text}")
        print(f"{'='*60}\n")
        
    def test_1_health_check(self):
        """Test health endpoint"""
        print("\n🔵 STEP 1: Testing Health Check...")
        
        response = requests.get(f'{BASE_URL}/health')
        self.print_response("HEALTH CHECK", response)
        
        if response.status_code == 200:
            print("✅ Health check PASSED!")
            return True
        else:
            print("❌ Health check FAILED!")
            return False
    
    def test_2_register(self):
        """Test user registration"""
        print("\n🔵 STEP 2: Testing Registration...")
        
        data = {
            'email': self.test_email,
            'password': self.test_password,
            'full_name': 'Test User'
        }
        
        response = requests.post(
            f'{BASE_URL}/auth/register',
            json=data,
            headers={'Content-Type': 'application/json'}
        )
        
        self.print_response("REGISTRATION", response)
        
        if response.status_code in [200, 201]:
            print("✅ Registration PASSED!")
            return True
        else:
            print("❌ Registration FAILED!")
            return False
    
    def test_3_login(self):
        """Test user login"""
        print("\n🔵 STEP 3: Testing Login...")
        
        data = {
            'email': self.test_email,
            'password': self.test_password
        }
        
        response = requests.post(
            f'{BASE_URL}/auth/login',
            json=data,
            headers={'Content-Type': 'application/json'}
        )
        
        self.print_response("LOGIN", response)
        
        if response.status_code == 200:
            result = response.json()
            if 'access_token' in result or 'token' in result:
                self.token = result.get('access_token') or result.get('token')
                print(f"✅ Login PASSED! Token received: {self.token[:30]}...")
                return True
        
        print("❌ Login FAILED!")
        return False
    
    def test_4_get_current_user(self):
        """Test getting current user (protected route)"""
        print("\n🔵 STEP 4: Testing Get Current User...")
        
        if not self.token:
            print("⚠️ SKIPPED: No token available")
            return False
        
        response = requests.get(
            f'{BASE_URL}/auth/me',
            headers={
                'Authorization': f'Bearer {self.token}',
                'Content-Type': 'application/json'
            }
        )
        
        self.print_response("GET CURRENT USER", response)
        
        if response.status_code == 200:
            print("✅ Get current user PASSED!")
            return True
        else:
            print("❌ Get current user FAILED!")
            return False
    
    def test_5_user_profile(self):
        """Test getting user profile"""
        print("\n🔵 STEP 5: Testing Get User Profile...")
        
        if not self.token:
            print("⚠️ SKIPPED: No token available")
            return False
        
        response = requests.get(
            f'{BASE_URL}/user/profile',
            headers={
                'Authorization': f'Bearer {self.token}',
                'Content-Type': 'application/json'
            }
        )
        
        self.print_response("USER PROFILE", response)
        
        if response.status_code == 200:
            print("✅ User profile PASSED!")
            return True
        else:
            print("❌ User profile FAILED!")
            return False
    
    def test_6_research_generate(self):
        """Test research specification generation"""
        print("\n🔵 STEP 6: Testing Research Spec Generation...")
        
        if not self.token:
            print("⚠️ SKIPPED: No token available")
            return False
        
        # Create config data
        config_data = {
            'field_of_study': 'Computer Science',
            'research_topic': 'Heart Disease Prediction using Machine Learning',
            'academic_level': 'MSc',
            'effort_level': 'medium',
            'past_projects_mode': 'hybrid',
            'num_auto_projects_target': 3,
            'min_auto_projects_required': 1,
            'max_auto_projects_accepted': 3,
            'deduplicate_auto_vs_user': True,
            'max_iterations': 3,
            'num_web_searches': 5
        }
        
        # Create temporary guidelines file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
            f.write("University Research Guidelines\n\n")
            f.write("1. All research must be original\n")
            f.write("2. Follow ethical standards\n")
            f.write("3. Cite sources properly\n")
            guidelines_path = f.name
        
        try:
            with open(guidelines_path, 'rb') as guidelines_file:
                
                # Send config_json as STRING in form data
                # Send guidelines_file as FILE
                form_data = {
                    'config_json': json.dumps(config_data)
                }
                
                files = {
                    'guidelines_file': ('university_guidelines.txt', guidelines_file, 'text/plain')
                }
                
                response = requests.post(
                    f'{BASE_URL}/research/generate',
                    data=form_data,  # Form data with JSON string
                    files=files,     # File upload
                    headers={
                        'Authorization': f'Bearer {self.token}'
                    }
                )
            
            self.print_response("RESEARCH GENERATION", response)
            
            if response.status_code in [200, 201, 202]:
                result = response.json()
                if 'project_id' in result:
                    self.project_id = result['project_id']
                    print(f"📝 Project ID: {self.project_id}")
                print("✅ Research generation PASSED!")
                return True
            else:
                print("❌ Research generation FAILED!")
                return False
                
        finally:
            if os.path.exists(guidelines_path):
                os.unlink(guidelines_path)
    
    def test_7_list_projects(self):
        """Test listing user projects"""
        print("\n🔵 STEP 7: Testing List Projects...")
        
        if not self.token:
            print("⚠️ SKIPPED: No token available")
            return False
        
        response = requests.get(
            f'{BASE_URL}/projects/',
            headers={
                'Authorization': f'Bearer {self.token}',
                'Content-Type': 'application/json'
            }
        )
        
        self.print_response("LIST PROJECTS", response)
        
        if response.status_code == 200:
            print("✅ List projects PASSED!")
            return True
        else:
            print("❌ List projects FAILED!")
            return False
    
    def test_8_request_password_reset(self):
        """Test password reset request"""
        print("\n🔵 STEP 8: Testing Request Password Reset...")
        
        data = {'email': self.test_email}
        
        response = requests.post(
            f'{BASE_URL}/auth/request-password-reset',
            json=data,
            headers={'Content-Type': 'application/json'}
        )
        
        self.print_response("PASSWORD RESET REQUEST", response)
        
        if response.status_code in [200, 201, 202]:
            print("✅ Password reset request PASSED!")
            return True
        else:
            print("❌ Password reset request FAILED!")
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("\n" + "🚀"*30)
        print("STARTING BACKEND TESTS FOR RESEARCH ASSISTANT")
        print("Backend URL: " + BASE_URL)
        print("🚀"*30 + "\n")
        
        results = {}
        
        # Run tests
        results['Health Check'] = self.test_1_health_check()
        time.sleep(0.5)
        
        results['Registration'] = self.test_2_register()
        time.sleep(0.5)
        
        results['Login'] = self.test_3_login()
        time.sleep(0.5)
        
        results['Get Current User'] = self.test_4_get_current_user()
        time.sleep(0.5)
        
        results['User Profile'] = self.test_5_user_profile()
        time.sleep(0.5)
        
        results['Research Generation'] = self.test_6_research_generate()
        time.sleep(0.5)
        
        results['List Projects'] = self.test_7_list_projects()
        time.sleep(0.5)
        
        results['Password Reset'] = self.test_8_request_password_reset()
        
        # Print summary
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        
        passed = sum(results.values())
        total = len(results)
        
        for test_name, passed_test in results.items():
            status = "✅ PASS" if passed_test else "❌ FAIL"
            print(f"{test_name}: {status}")
        
        print(f"\nTotal: {passed}/{total} tests passed")
        
        if passed == total:
            print("\n🎉🎉🎉 ALL TESTS PASSED! BACKEND IS SOLID! 🎉🎉🎉")
            print("Your backend is working perfectly!")
            print("Now you can confidently connect your frontend! 💪")
        else:
            print(f"\n⚠️ {total - passed} test(s) failed. Check errors above.")
            print("Fix these issues before connecting frontend!")
        
        print("="*60 + "\n")


if __name__ == '__main__':
    print("⚠️ Make sure your backend is running on localhost:8000")
    print("Press Ctrl+C to cancel, or...")
    input("Press Enter to start testing...\n")
    
    tester = BackendTester()
    tester.run_all_tests()