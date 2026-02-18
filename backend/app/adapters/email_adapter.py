"""
Email Adapter — FIXED

Bugs fixed:
  1. FROM_EMAIL was 'noreply@researchassistant.ai' — Resend rejects it because
     that domain is NOT verified. Free sandbox only allows FROM 'onboarding@resend.dev'.
     Set FROM_EMAIL=Research Assistant <noreply@yourdomain.com> in .env once you
     verify your own domain in the Resend dashboard.

  2. Not a module-level singleton anymore — each get_email_adapter() call creates
     a fresh instance so it reads RESEND_API_KEY AFTER load_dotenv() has run.

  3. send_specification_email is SYNC (plain def) — never await it.
"""

import os
from typing import Optional, Dict, List
import resend


class EmailAdapter:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("RESEND_API_KEY")
        self.enabled = bool(self.api_key)

        if not self.enabled:
            print("⚠️  RESEND_API_KEY not set — email notifications disabled")
            return

        resend.api_key = self.api_key

        # ── IMPORTANT: Resend free sandbox only allows sending FROM this address.
        # Once you verify your own domain, set FROM_EMAIL in backend/.env:
        #   FROM_EMAIL=Research Assistant <noreply@yourdomain.com>
        self.from_email = os.getenv("FROM_EMAIL", "onboarding@resend.dev")
        print(f"✅ Email adapter ready — from: {self.from_email}")

    # ─────────────────────────────────────────────────────────────────────────
    # CORE
    # ─────────────────────────────────────────────────────────────────────────

    def send_email(self, to: str, subject: str, html: str,
                   text: Optional[str] = None,
                   attachments: Optional[List[Dict]] = None) -> Dict:
        if not self.enabled:
            print(f"⚠️  Email disabled — would send '{subject}' to {to}")
            return {"success": False, "error": "Email adapter disabled"}
        try:
            params: Dict = {"from": self.from_email, "to": [to], "subject": subject, "html": html}
            if text:       params["text"] = text
            if attachments: params["attachments"] = attachments
            result = resend.Emails.send(params)
            print(f"✅ Email sent to {to} — id: {result.get('id')}")
            return {"success": True, "email_id": result.get("id")}
        except Exception as exc:
            print(f"❌ Email send failed: {exc}")
            return {"success": False, "error": str(exc)}

    # ─────────────────────────────────────────────────────────────────────────
    # AUTH EMAILS
    # ─────────────────────────────────────────────────────────────────────────

    def send_verification_email(self, to_email: str, full_name: str, verification_url: str) -> bool:
        if not self.enabled:
            print(f"⚠️  Email disabled — verify URL: {verification_url}")
            return False
        html = f"""<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:20px">
<div style="max-width:600px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:30px;
              text-align:center;border-radius:10px 10px 0 0"><h1>Verify Your Email</h1></div>
  <div style="background:#f9fafb;padding:30px;border-radius:0 0 10px 10px">
    <p>Hi {full_name}, please verify your email:</p>
    <p style="text-align:center">
      <a href="{verification_url}" style="display:inline-block;padding:15px 30px;
         background:#667eea;color:white;text-decoration:none;border-radius:5px">
        Verify Email</a></p>
    <p style="color:#666;font-size:12px">Link expires in 24 hours.</p>
  </div></div></body></html>"""
        return self.send_email(to_email, "Verify Your Email — Research Assistant", html).get("success", False)

    def send_password_reset_email(self, to_email: str, full_name: str, reset_url: str) -> bool:
        if not self.enabled:
            print(f"⚠️  Email disabled — reset URL: {reset_url}")
            return False
        html = f"""<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:20px">
<div style="max-width:600px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:30px;
              text-align:center;border-radius:10px 10px 0 0"><h1>Reset Password</h1></div>
  <div style="background:#f9fafb;padding:30px;border-radius:0 0 10px 10px">
    <p>Hi {full_name},</p>
    <p style="text-align:center">
      <a href="{reset_url}" style="display:inline-block;padding:15px 30px;
         background:#667eea;color:white;text-decoration:none;border-radius:5px">
        Reset Password</a></p>
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin:20px 0">
      ⚠️ This link expires in 1 hour.</div>
  </div></div></body></html>"""
        return self.send_email(to_email, "Reset Your Password — Research Assistant", html).get("success", False)

    def send_welcome_email(self, to_email: str, full_name: str) -> bool:
        if not self.enabled:
            return False
        html = f"""<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:20px">
<div style="max-width:600px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:30px;
              text-align:center;border-radius:10px 10px 0 0"><h1>Welcome, {full_name}!</h1></div>
  <div style="background:#f9fafb;padding:30px;border-radius:0 0 10px 10px">
    <p>Your account is active. Start generating research specifications now!</p>
    <p style="text-align:center">
      <a href="http://localhost:3000/dashboard" style="display:inline-block;padding:15px 30px;
         background:#667eea;color:white;text-decoration:none;border-radius:5px">
        Go to Dashboard</a></p>
  </div></div></body></html>"""
        return self.send_email(to_email, "Welcome to Research Assistant! 🎉", html).get("success", False)

    # ─────────────────────────────────────────────────────────────────────────
    # SPECIFICATION EMAIL — SYNC, do NOT await this
    # ─────────────────────────────────────────────────────────────────────────

    def send_specification_email(self, to: str, project_title: str,
                                  specification_html: str, marks: int,
                                  decision: str) -> Dict:
        """Send completed specification. SYNC method — do NOT await."""
        badge_color = "#10b981" if decision == "APPROVED" else "#f59e0b"
        subject = f"Your Research Specification is Ready: {project_title}"
        html = f"""<!DOCTYPE html><html>
<head><style>
body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
     line-height:1.6;color:#333;max-width:800px;margin:0 auto;padding:20px}}
.header{{background:linear-gradient(135deg,#667eea,#764ba2);color:white;
         padding:30px;border-radius:10px;text-align:center}}
.marks{{font-size:48px;font-weight:bold;margin:20px 0}}
.badge{{background:{badge_color};color:white;padding:10px 20px;
        border-radius:5px;display:inline-block;font-weight:bold}}
.body{{background:#f9fafb;padding:30px;border-radius:10px;margin-top:20px}}
</style></head>
<body>
  <div class="header">
    <h1>✅ Your Specification is Ready!</h1>
    <p>{project_title}</p>
  </div>
  <div style="text-align:center;margin:30px 0">
    <div class="marks">{marks}/100</div>
    <div class="badge">{decision}</div>
  </div>
  <div class="body">{specification_html}</div>
  <div style="text-align:center;margin-top:40px;color:#6b7280">
    Generated by Research Assistant</div>
</body></html>"""
        return self.send_email(to=to, subject=subject, html=html)

    def test_connection(self) -> bool:
        return bool(self.api_key)


# ── Factory (NOT cached singleton) ───────────────────────────────────────────
# Returns a new instance each call so RESEND_API_KEY is read after load_dotenv()

def get_email_adapter() -> EmailAdapter:
    return EmailAdapter()