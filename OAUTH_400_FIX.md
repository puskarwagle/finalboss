# Fix Google OAuth 400 Error

## Problem
You're getting a 400 error: "The server cannot process the request because it is malformed"

This happens because:
1. ✅ Your `.env` file has the correct credentials
2. ❌ But the environment variables weren't being loaded when starting the dev server
3. ❌ So OAuth was using `'test-client-id'` instead of your real Client ID
4. ❌ Google rejected the request as malformed

## ✅ What I Fixed

1. **Created `dev-with-env.sh`** - A script that properly loads `.env` before starting the server
2. **Updated `package.json`** - Changed `npm run dev` to use the new script
3. **Updated `vite.config.ts`** - Added proper env loading configuration
4. **Cleaned `.env` file** - Removed problematic trailing characters

## 🚀 How to Start the App Now

### Option 1: Using Tauri (Recommended)
```bash
cd /Users/admin/extratech/inquisitive-mind/finalboss
bun run tauri dev
```

This will:
1. Load your `.env` file with Google OAuth credentials
2. Start the Vite dev server on port 1420
3. Launch the Tauri desktop app
4. Now Google OAuth will work! ✨

### Option 2: Just the Web Server
```bash
cd /Users/admin/extratech/inquisitive-mind/finalboss
npm run dev
```

This starts only the web server on http://localhost:1420

## 🔐 Google Cloud Console Setup

You STILL need to add the correct URLs to Google Cloud Console:

### 1. Go to Google Cloud Console
https://console.cloud.google.com/apis/credentials

### 2. Find Your OAuth Client
Client ID: `439974099982-63asf5a2gbhugepg2uoac4icvgdtpotb`

### 3. Add These URLs

**Authorized JavaScript origins:**
```
http://localhost:1420
http://localhost:3000
http://127.0.0.1:1420
http://127.0.0.1:3000
```

**Authorized redirect URIs:**
```
http://localhost:1420/auth/google/callback
http://localhost:1420/auth/corpus-rag/callback
http://localhost:3000/api/auth/callback
http://127.0.0.1:1420/auth/google/callback
http://127.0.0.1:3000/api/auth/callback
```

### 4. Click SAVE

### 5. ⏰ WAIT 5-10 Minutes
Google OAuth changes take time to propagate!

## 🧪 Test the Fix

After adding URLs to Google Cloud Console and waiting 5-10 minutes:

1. **Kill any running processes:**
   ```bash
   pkill -f "vite|tauri"
   ```

2. **Start fresh:**
   ```bash
   cd /Users/admin/extratech/inquisitive-mind/finalboss
   bun run tauri dev
   ```

3. **Wait for the server to start:**
   You should see:
   ```
   ✅ Environment variables loaded from .env
   📍 GOOGLE_CLIENT_ID: 439974099982-63asf5...
   📍 API_BASE_URL: http://localhost:1420
   ```

4. **Try logging in with Google**
   - Open http://localhost:1420
   - Click "Login with Google"
   - Should work! ✅

## ❌ If Still Getting Errors

### Error: "origin_mismatch"
- You didn't add the URLs to Google Cloud Console
- Or you didn't wait 5-10 minutes after saving
- Or you're accessing from a different URL than registered

### Error: "400 malformed request"
- Environment variables aren't loading
- Check that `dev-with-env.sh` is executable:
  ```bash
  chmod +x dev-with-env.sh
  ```
- Check that `.env` file exists and has correct values:
  ```bash
  cat .env | grep GOOGLE_CLIENT_ID
  ```

### Error: "unauthorized_client"
- Your Google Client ID or Secret is wrong
- Check Google Cloud Console credentials

## 🔍 Debug Commands

### Check if .env is being loaded:
```bash
cd /Users/admin/extratech/inquisitive-mind/finalboss
./dev-with-env.sh
```

You should see output like:
```
✅ Environment variables loaded from .env
📍 GOOGLE_CLIENT_ID: 439974099982-63asf5...
📍 API_BASE_URL: http://localhost:1420
```

### Check environment in running app:
Open browser console and check the network tab when you click "Login with Google". The request should include:
- `client_id=439974099982-63asf5a2gbhugepg2uoac4icvgdtpotb.apps.googleusercontent.com`
- `redirect_uri=http://localhost:1420/auth/google/callback`

## 📝 What Changed in Your Files

1. **vite.config.ts** - Added `loadEnv` to properly load environment variables
2. **package.json** - `npm run dev` now runs `dev-with-env.sh`
3. **dev-with-env.sh** - New script that loads `.env` before starting
4. **.env** - Cleaned up (removed trailing `%` character)

## ✅ Summary

To make OAuth work:

1. ✅ **Code is fixed** - Environment variables will now load properly
2. ⏳ **You need to do** - Add URLs to Google Cloud Console
3. ⏰ **Then wait** - 5-10 minutes for Google to propagate changes
4. 🧪 **Then test** - Restart app and try logging in

**The 400 error should be gone once you restart the app!**

The remaining work is just adding the URLs to Google Cloud Console and waiting for the changes to propagate.

