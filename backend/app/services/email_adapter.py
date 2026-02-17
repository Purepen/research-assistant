"""
Email Adapter - Additional Methods

Add these methods to your EmailAdapter class in email_adapter.py
"""

def send_verification_email(
    self,
    to_email: str,
    full_name: str,
    verification_url: str
) -> bool:
    """Send email verification email"""
    
    if not self.enabled:
        print(f"⚠️  Email disabled - would send verification to {to_email}")
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
    
    return self.send_email(
        to_email=to_email,
        subject="Verify Your Email - Research Assistant",
        html_content=html_content
    )


def send_password_reset_email(
    self,
    to_email: str,
    full_name: str,
    reset_url: str
) -> bool:
    """Send password reset email"""
    
    if not self.enabled:
        print(f"⚠️  Email disabled - would send password reset to {to_email}")
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
    
    return self.send_email(
        to_email=to_email,
        subject="Reset Your Password - Research Assistant",
        html_content=html_content
    )


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
    
    return self.send_email(
        to_email=to_email,
        subject="Welcome to Research Assistant! 🎉",
        html_content=html_content
    )
