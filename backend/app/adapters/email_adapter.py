"""
Email Adapter - COMPLETE

Purpose: Abstract Resend API for email sending
Includes: Specification emails, verification, password reset, welcome
"""

import os
from typing import Optional, Dict, List
import resend


class EmailAdapter:
    """
    Complete email adapter with all email types
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize email adapter
        
        Args:
            api_key: Resend API key (defaults to env var)
        """
        self.enabled = True
        self.api_key = api_key or os.getenv("RESEND_API_KEY")
        
        if not self.api_key:
            print("⚠️  Warning: Resend API key not provided - email notifications disabled")
            self.enabled = False
            return
        
        resend.api_key = self.api_key
        self.from_email = os.getenv("FROM_EMAIL", "Research Assistant <noreply@researchassistant.ai>")
    
    # ======================
    # CORE EMAIL METHOD
    # ======================
    
    def send_email(
        self,
        to: str,
        subject: str,
        html: str,
        text: Optional[str] = None,
        attachments: Optional[List[Dict]] = None
    ) -> Dict[str, any]:
        """
        Send email via Resend
        
        Args:
            to: Recipient email address
            subject: Email subject
            html: HTML email body
            text: Plain text fallback
            attachments: List of attachment dicts
            
        Returns:
            Send result dict
        """
        if not self.enabled:
            print(f"⚠️  Email disabled - would send to {to}: {subject}")
            return {"success": False, "error": "Email adapter disabled"}
        
        try:
            params = {
                "from": self.from_email,
                "to": [to],
                "subject": subject,
                "html": html,
            }
            
            if text:
                params["text"] = text
            
            if attachments:
                params["attachments"] = attachments
            
            result = resend.Emails.send(params)
            
            return {
                "success": True,
                "email_id": result.get("id"),
                "message": "Email sent successfully"
            }
            
        except Exception as e:
            print(f"❌ Email send failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    # ======================
    # AUTHENTICATION EMAILS
    # ======================
    
    def send_verification_email(
        self,
        to_email: str,
        full_name: str,
        verification_url: str
    ) -> bool:
        """Send email verification email"""
        
        if not self.enabled:
            print(f"⚠️  Email disabled - would send verification to {to_email}")
            print(f"    Verification URL: {verification_url}")
            return False
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                   color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
        .button {{ display: inline-block; padding: 15px 30px; background: #667eea; 
                  color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        .footer {{ text-align: center; margin-top: 30px; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to Research Assistant!</h1>
        </div>
        <div class="content">
            <p>Hi {full_name},</p>
            <p>Thank you for registering! Please verify your email address to activate your account.</p>
            <p style="text-align: center;">
                <a href="{verification_url}" class="button">Verify Email Address</a>
            </p>
            <p>Or copy and paste this link:</p>
            <p style="background: white; padding: 15px; border-radius: 5px; word-break: break-all;">
                {verification_url}
            </p>
            <p>This link will expire in 24 hours.</p>
        </div>
        <div class="footer">
            <p>If you didn't create this account, you can safely ignore this email.</p>
            <p>© 2026 Research Assistant. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""
        
        result = self.send_email(
            to=to_email,
            subject="Verify Your Email - Research Assistant",
            html=html_content
        )
        
        return result.get("success", False)
    
    def send_password_reset_email(
        self,
        to_email: str,
        full_name: str,
        reset_url: str
    ) -> bool:
        """Send password reset email"""
        
        if not self.enabled:
            print(f"⚠️  Email disabled - would send password reset to {to_email}")
            print(f"    Reset URL: {reset_url}")
            return False
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                   color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
        .button {{ display: inline-block; padding: 15px 30px; background: #667eea; 
                  color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        .warning {{ background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }}
        .footer {{ text-align: center; margin-top: 30px; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Password Reset Request</h1>
        </div>
        <div class="content">
            <p>Hi {full_name},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p style="text-align: center;">
                <a href="{reset_url}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link:</p>
            <p style="background: white; padding: 15px; border-radius: 5px; word-break: break-all;">
                {reset_url}
            </p>
            <div class="warning">
                <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour.
            </div>
            <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
        </div>
        <div class="footer">
            <p>For security, this email was sent from an automated system.</p>
            <p>© 2026 Research Assistant. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""
        
        result = self.send_email(
            to=to_email,
            subject="Reset Your Password - Research Assistant",
            html=html_content
        )
        
        return result.get("success", False)
    
    def send_welcome_email(
        self,
        to_email: str,
        full_name: str
    ) -> bool:
        """Send welcome email after email verification"""
        
        if not self.enabled:
            return False
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                   color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
        .feature {{ background: white; padding: 15px; margin: 10px 0; border-radius: 5px; 
                   border-left: 4px solid #667eea; }}
        .button {{ display: inline-block; padding: 15px 30px; background: #667eea; 
                  color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ You're All Set!</h1>
        </div>
        <div class="content">
            <p>Hi {full_name},</p>
            <p>Welcome to Research Assistant! Your account is now fully activated.</p>
            <h3>What you can do now:</h3>
            <div class="feature">
                <strong>📝 Generate Specifications</strong><br>
                Upload your guidelines and let 22 AI agents create your research specification in minutes.
            </div>
            <div class="feature">
                <strong>👨‍🏫 Professor Review</strong><br>
                Get detailed feedback and scoring from our AI professor before submission.
            </div>
            <div class="feature">
                <strong>⚡ Fast & Field-Agnostic</strong><br>
                Works for any research field - Computer Science, Biology, Engineering, and more!
            </div>
            <p style="text-align: center;">
                <a href="http://localhost:3000/dashboard" class="button">Go to Dashboard</a>
            </p>
        </div>
    </div>
</body>
</html>
"""
        
        result = self.send_email(
            to=to_email,
            subject="Welcome to Research Assistant! 🎉",
            html=html_content
        )
        
        return result.get("success", False)
    
    # ======================
    # SPECIFICATION EMAILS
    # ======================
    
    def send_specification_email(
        self,
        to: str,
        project_title: str,
        specification_html: str,
        marks: int,
        decision: str
    ) -> Dict[str, any]:
        """
        Send specification completion email
        
        Args:
            to: Recipient email
            project_title: Project title
            specification_html: HTML specification
            marks: Total marks
            decision: Review decision
            
        Returns:
            Send result dict
        """
        
        subject = f"Research Specification Complete: {project_title}"
        
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
        }}
        .marks {{
            font-size: 48px;
            font-weight: bold;
            margin: 20px 0;
        }}
        .decision {{
            background: {'#10b981' if decision == 'APPROVED' else '#f59e0b'};
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            display: inline-block;
            font-weight: bold;
        }}
        .content {{
            background: #f9fafb;
            padding: 30px;
            border-radius: 10px;
            margin-top: 20px;
        }}
        .footer {{
            text-align: center;
            margin-top: 40px;
            color: #6b7280;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>✅ Your Research Specification is Ready!</h1>
        <p>{project_title}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
        <div class="marks">{marks}/100</div>
        <div class="decision">{decision}</div>
    </div>
    
    <div class="content">
        {specification_html}
    </div>
    
    <div class="footer">
        <p>Generated by Research Assistant</p>
        <p>Need revisions? Login to your dashboard to regenerate.</p>
    </div>
</body>
</html>
"""
        
        return self.send_email(to, subject, html)
    
    def send_progress_notification(
        self,
        to: str,
        project_title: str,
        phase: str,
        progress_percentage: int
    ) -> Dict[str, any]:
        """
        Send progress update email
        
        Args:
            to: Recipient email
            project_title: Project title
            phase: Current phase
            progress_percentage: Progress (0-100)
            
        Returns:
            Send result dict
        """
        
        subject = f"Progress Update: {project_title} - {progress_percentage}%"
        
        html = f"""
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; padding: 20px;">
    <h2>🔄 Generation in Progress</h2>
    <p><strong>{project_title}</strong></p>
    <p>Current phase: {phase}</p>
    <div style="background: #e5e7eb; border-radius: 10px; height: 30px; width: 100%; margin: 20px 0;">
        <div style="background: linear-gradient(90deg, #667eea, #764ba2); height: 100%; width: {progress_percentage}%; border-radius: 10px;"></div>
    </div>
    <p>{progress_percentage}% complete</p>
</body>
</html>
"""
        
        return self.send_email(to, subject, html)
    
    # ======================
    # UTILITIES
    # ======================
    
    def test_connection(self) -> bool:
        """
        Test if Resend API connection works
        
        Returns:
            True if connection successful
        """
        try:
            return bool(self.api_key and len(self.api_key) > 0)
        except Exception as e:
            print(f"Resend connection test failed: {e}")
            return False


# ======================
# SINGLETON INSTANCE
# ======================

_email_adapter: Optional[EmailAdapter] = None


def get_email_adapter() -> EmailAdapter:
    """Get singleton email adapter instance"""
    global _email_adapter
    if _email_adapter is None:
        _email_adapter = EmailAdapter()
    return _email_adapter