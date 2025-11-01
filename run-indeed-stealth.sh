#!/bin/bash

# Run Indeed bot in STEALTH MODE (bypasses Cloudflare)
# This uses your real Chrome profile to look like a normal user

echo "🥷 STEALTH MODE: Using your real Chrome profile"
echo "================================================"
echo ""
echo "⚠️  Close all Chrome windows before running!"
echo ""
read -p "Press Enter to continue (or Ctrl+C to cancel)..."

# Kill any running Chrome instances
killall chrome 2>/dev/null || true
killall google-chrome 2>/dev/null || true
killall chromium 2>/dev/null || true

sleep 1

echo ""
echo "🚀 Starting Indeed bot with STEALTH MODE..."
echo ""

# Run bot with real Chrome profile
USE_REAL_CHROME=true bun src/bots/bot_starter.ts indeed

echo ""
echo "✅ Bot finished!"
