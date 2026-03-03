# 🚀 Research Assistant - Setup Guide

Complete guide to get your Research Assistant application running.

---

## 📋 Prerequisites

Before you begin, ensure you have:

- ✅ Python 3.10 or higher
- ✅ Node.js 18 or higher
- ✅ OpenAI API key
- ✅ Google OAuth credentials
- ✅ Resend API key (optional, for emails)

---

## 🔧 Backend Setup

### Step 1: Navigate to Backend

```bash
cd backend
```

### Step 2: Create Virtual Environment

```bash
python -m venv venv

# Activate it:
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Configure Environment

```bash
cp .env.example .env
```

Then edit `.env` with your actual credentials:

```env
# Required
OPENAI_API_KEY=sk-your-actual-key
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
JWT_SECRET_KEY=generate-a-random-32-character-string

# Optional
RESEND_API_KEY=re_your_key
```

**Generate JWT Secret:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Step 5: Initialize Database

The database will be created automatically on first run (SQLite by default).

### Step 6: Run Backend Server

```bash
# From backend/ directory
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

✅ Backend should be running at: `http://localhost:8000`

✅ API Docs at: `http://localhost:8000/docs`

---

## 🎨 Frontend Setup

### Step 1: Navigate to Frontend

Open a **NEW terminal** and:

```bash
cd frontend
```

### Step 2: Install Dependencies

```bash
npm install
# or
yarn install
```

### Step 3: Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

**Note:** Use the **SAME** Google Client ID as backend!

### Step 4: Run Development Server

```bash
npm run dev
# or
yarn dev
```

✅ Frontend should be running at: `http://localhost:3000`

---

## 🔑 Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API**

### Step 2: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**
4. Add authorized origins:
   - `http://localhost:3000`
   - `http://localhost:8000`
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
6. Copy **Client ID** and **Client Secret**

### Step 3: Add to Environment Files

Add the Client ID to **BOTH** `.env` files:

**Backend (.env):**
```env
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
```

---

## 📧 Email Setup (Optional)

### Using Resend

1. Sign up at [Resend](https://resend.com/)
2. Create API key
3. Add to backend `.env`:

```env
RESEND_API_KEY=re_your_key
FROM_EMAIL=Research Assistant <noreply@yourdomain.com>
```

---

## ✅ Testing the Setup

### 1. Check Backend Health

```bash
curl http://localhost:8000/health
```

Should return:
```json
{"status": "healthy"}
```

### 2. Open Frontend

Visit: `http://localhost:3000`

You should see the landing page with animations.

### 3. Test Sign In

1. Click **Get Started**
2. Click **Sign in with Google**
3. Complete OAuth flow
4. You should be redirected to dashboard

### 4. Test Generation (Full Flow)

1. Go to **Generate**
2. Fill in:
   - Field: "Computer Science"
   - Academic Level: MSc
3. Upload a sample guidelines document
4. Click through steps
5. Submit
6. Watch progress tracker
7. View results when complete

---

## 🐛 Troubleshooting

### Backend Issues

**Problem:** `ModuleNotFoundError`
```bash
# Make sure you're in the virtual environment
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

**Problem:** `OPENAI_API_KEY not found`
```bash
# Check your .env file exists and has the key
cat .env | grep OPENAI
```

**Problem:** Port 8000 already in use
```bash
# Kill process on port 8000
# macOS/Linux:
lsof -ti:8000 | xargs kill -9
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Frontend Issues

**Problem:** `API_URL is not defined`
```bash
# Make sure .env.local exists
cat .env.local
# Restart dev server after changing .env.local
```

**Problem:** CORS errors
```bash
# Check backend is running
# Check FRONTEND_URL in backend .env matches frontend URL
```

**Problem:** Google Sign In not working
```bash
# Verify Client ID in both .env files matches
# Check Google Console authorized origins
```

---

## 📦 Project Structure

```
research-assistant/
├── backend/
│   ├── app/
│   │   ├── models/          # Data structures
│   │   ├── core/
│   │   │   ├── agents/      # 22 AI agents
│   │   │   ├── pipelines/   # Workflows
│   │   │   └── domain/      # Business logic
│   │   ├── adapters/        # External services
│   │   ├── services/        # Business layer
│   │   ├── api/routes/      # REST endpoints
│   │   └── utils/           # Helpers
│   ├── main.py              # Entry point
│   ├── requirements.txt     # Dependencies
│   └── .env                 # Configuration
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js pages
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utilities
│   │   └── types/          # TypeScript types
│   ├── package.json        # Dependencies
│   └── .env.local          # Configuration
└── SETUP_GUIDE.md          # This file
```

---

## 🚀 Next Steps

1. ✅ Both servers running
2. ✅ Google OAuth working
3. ✅ Can sign in successfully
4. ✅ Test generation flow

**You're ready to develop!** 🎉

---

## 📞 Support

If you encounter issues:

1. Check this guide carefully
2. Review error messages in console
3. Verify all environment variables
4. Ensure both servers are running
5. Check API docs at `/docs`

---

## 🔒 Security Notes

- Never commit `.env` or `.env.local` files
- Keep API keys secure
- Use HTTPS in production
- Rotate JWT secrets regularly
- Enable rate limiting in production

---

## 📝 Development Tips

**Backend:**
- API docs available at `/docs`
- Auto-reload enabled with `--reload` flag
- Use `/health` endpoint for monitoring
- Check logs for errors

**Frontend:**
- Hot reload enabled by default
- Use React DevTools for debugging
- Check Network tab for API calls
- Use browser console for errors

---

**Happy coding!** 🚀


#latest update to run 
cd backend
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

cd frontend
npm run dev





