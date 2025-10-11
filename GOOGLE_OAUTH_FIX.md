# Fix Google OAuth origin_mismatch Error

## The Problem
You're getting: `Error 400: origin_mismatch` because the URL you're accessing the app from isn't registered in Google Cloud Console.

## ⚡ QUICK FIX - DO THIS NOW:

### 1. Go to Google Cloud Console
Visit: https://console.cloud.google.com/apis/credentials

### 2. Edit Your OAuth Client
- Find OAuth Client ID: `439974099982-63asf5a2gbhugepg2uoac4icvgdtpotb`
- Click the **✏️ Edit** button

### 3. Add These URLs

**Authorized JavaScript origins** (add ALL of these):
```
http://localhost:1420
http://localhost:3000
http://localhost:5173
http://localhost:5174
http://localhost:5175
http://localhost:5176
http://127.0.0.1:1420
http://127.0.0.1:3000
http://127.0.0.1:5173
```

**Authorized redirect URIs** (add ALL of these):
```
http://localhost:1420/auth/google/callback
http://localhost:1420/auth/corpus-rag/callback
http://localhost:3000/api/auth/callback
http://localhost:5173/api/auth/callback
http://localhost:5174/api/auth/callback
http://localhost:5175/api/auth/callback
http://localhost:5176/api/auth/callback
http://127.0.0.1:1420/auth/google/callback
http://127.0.0.1:3000/api/auth/callback
http://127.0.0.1:5173/api/auth/callback
```

### 4. Click SAVE

### 5. ⏰ WAIT 5-10 MINUTES
Google's OAuth changes take time to propagate. Don't test immediately!

### 6. Test Again
- Clear browser cache OR use incognito/private window
- Try logging in again

---

## Step-by-Step Fix

### 1. Identify Your Current URL
First, check what URL you're accessing the app from:
- Is it `http://localhost:1420`?
- Is it `http://localhost:5173`?
- Is it `http://127.0.0.1:1420`?
- Or a different URL?

**Important:** You need to register the EXACT URL you're using.

### 2. Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Select your project: **quest-bot-drive**
3. Go to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID and click **Edit** (pencil icon)

### 3. Add Authorized JavaScript Origins
In the **Authorized JavaScript origins** section, add ALL of these:
```
http://localhost:1420
http://localhost:5173
http://127.0.0.1:1420
http://127.0.0.1:5173
```

### 4. Add Authorized Redirect URIs
In the **Authorized redirect URIs** section, add ALL of these:
```
http://localhost:1420/auth/google/callback
http://localhost:5173/auth/google/callback
http://127.0.0.1:1420/auth/google/callback
http://127.0.0.1:5173/auth/google/callback
http://localhost:1420/auth/corpus-rag/callback
http://localhost:5173/auth/corpus-rag/callback
```

### 5. Save Changes
Click **Save** at the bottom of the page.

### 6. Wait (Important!)
Google OAuth changes can take **5-10 minutes** to propagate. Don't test immediately!

### 7. Test Again
After waiting 5-10 minutes:
1. Clear your browser cache or open an incognito window
2. Go to your login page
3. Try signing in with Google again

## Still Not Working?

If you still get the error, check these:

### A. Verify Environment Variables
Make sure you have your Google OAuth credentials set:

```bash
# Check if you have a .env file
cd /Users/admin/extratech/inquisitive-mind/finalboss
ls -la | grep .env
```

Your `.env` file should contain:
```env
GOOGLE_CLIENT_ID=your_actual_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_actual_client_secret
```

### B. Check Exact URL Match
The error will also occur if:
- You registered `http://localhost:1420` but accessing via `http://127.0.0.1:1420`
- You registered without a port but accessing with a port
- You're using HTTPS but registered HTTP (or vice versa)

The URL must match **EXACTLY**.

### C. Verify Client ID
Make sure the `GOOGLE_CLIENT_ID` in your `.env` file matches the one in Google Cloud Console.

## Quick Commands

### Check if app is running
```bash
lsof -i :1420
lsof -i :5173
```

### Start the app (if not running)
```bash
cd /Users/admin/extratech/inquisitive-mind/finalboss
npm run dev
```

### Check environment variables (if .env exists)
```bash
cat .env | grep GOOGLE
```

## Production Setup
For production deployment, you'll also need to add:
```
https://yourdomain.com
https://yourdomain.com/auth/google/callback
```

Replace `yourdomain.com` with your actual domain.

## Screenshot Guide

When in Google Cloud Console > Credentials > Edit OAuth Client:

1. **Application type**: Web application
2. **Authorized JavaScript origins**: Add all localhost URLs
3. **Authorized redirect URIs**: Add all callback URLs
4. **Save** and **wait 5-10 minutes**

## Common Mistakes to Avoid

❌ Only adding redirect URIs (you need BOTH origins AND redirect URIs)
❌ Using different ports (be consistent with your port)
❌ Testing immediately after saving (wait 5-10 minutes)
❌ Not clearing browser cache after making changes
❌ Mixing localhost and 127.0.0.1 (add both to be safe)
❌ Missing the `/auth/google/callback` path in redirect URIs

## Need Help?

If you're still stuck, check:
1. What URL shows in your browser address bar when you see the error?
2. What's in your Google Cloud Console origins list?
3. What's in your Google Cloud Console redirect URIs list?

The URLs must match exactly!

