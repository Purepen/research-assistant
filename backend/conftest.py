# Ensures `import app...` works when pytest runs from the backend/ rootdir.

import os

# auth_service fails fast at import if JWT_SECRET_KEY is missing/short (Bug #7
# fix). pytest does not load .env, so provide a test secret before collection.
os.environ.setdefault("JWT_SECRET_KEY", "pytest-only-secret-key-0123456789abcdef")
