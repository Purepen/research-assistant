# Tiny stub of the backend API for local frontend verification only.
# Serves just enough JSON for the dashboard shell to render with a fake token.
import json
from http.server import BaseHTTPRequestHandler, HTTPServer

USER = {"id": 1, "email": "test@example.com", "full_name": "Test User",
        "auth_provider": "email", "is_verified": True, "created_at": "2026-07-16T00:00:00Z"}

ROUTES = {
    "/auth/me": USER,
    "/user/stats": {"total_projects": 2, "completed_projects": 1, "in_progress_projects": 0,
                     "failed_projects": 1, "average_score": 82, "has_own_api_key": False,
                     "free_topic_credit_used": False, "free_spec_credit_used": False},
    "/topics/history": {"total": 0, "topics": []},
    "/projects": [
        {"id": 1, "research_topic": "Econometric analysis of remittance flows and household welfare",
         "field_of_study": "Economics", "academic_level": "MSc", "effort_level": "medium",
         "status": "complete", "progress_percentage": 100, "current_phase": "Complete",
         "created_at": "2026-07-14T10:00:00Z", "completed_at": "2026-07-14T10:20:00Z"},
        {"id": 2, "research_topic": "Survey of fintech adoption among market traders",
         "field_of_study": "Business Administration", "academic_level": "BSc", "effort_level": "low",
         "status": "failed", "progress_percentage": 40, "current_phase": "Error: test",
         "created_at": "2026-07-13T09:00:00Z", "completed_at": None},
    ],
    "/user/profile": USER,
}

class H(BaseHTTPRequestHandler):
    def _send(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self._send(200, {})

    def do_GET(self):
        path = self.path.split("?")[0].rstrip("/") or "/"
        self._send(200, ROUTES.get(path, {}))

    def log_message(self, *a):
        pass

HTTPServer(("127.0.0.1", 8000), H).serve_forever()
