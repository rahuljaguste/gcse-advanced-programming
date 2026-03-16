#!/bin/bash
# =============================================
#  Vihaan's Python Learning Website
#  Flask + Redis Backend
# =============================================

cd "$(dirname "$0")"

# Check Python
if ! command -v python3 &>/dev/null; then
  echo "  ❌ Python 3 is not installed!"
  exit 1
fi

# Check pip dependencies
python3 -c "import flask, redis" 2>/dev/null
if [ $? -ne 0 ]; then
  echo ""
  echo "  📦 Installing dependencies..."
  pip3 install -r requirements.txt --break-system-packages 2>/dev/null || pip3 install -r requirements.txt 2>/dev/null
  if [ $? -ne 0 ]; then
    echo "  ❌ Failed to install dependencies. Run manually:"
    echo "     pip3 install flask redis"
    exit 1
  fi
fi

# Check Redis is running
if ! redis-cli ping >/dev/null 2>&1; then
  echo ""
  echo "  ❌ Redis is not running!"
  echo "  Start it with:  brew services start redis"
  echo "     or:          redis-server &"
  echo ""
  exit 1
fi

echo ""
echo "  🐍 Vihaan Learns Python"
echo "  ========================"
echo ""
echo "  Student site:      http://localhost:5000"
echo "  Assignments:       http://localhost:5000/assignments"
echo "  Playground:        http://localhost:5000/playground"
echo "  Flashcards:        http://localhost:5000/flashcards"
echo "  Cheat sheet:       http://localhost:5000/cheatsheet"
echo "  Teacher dashboard: http://localhost:5000/dashboard"
echo ""
echo "  Press Ctrl+C to stop."
echo ""

# Open browser automatically (macOS / Linux)
if command -v open &>/dev/null; then
  open "http://localhost:5000"
elif command -v xdg-open &>/dev/null; then
  xdg-open "http://localhost:5000"
fi

python3 server.py
