#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# Allow custom port or default to 8088 (port 8000 is reserved by adk web)
PORT="${PORT:-8088}"
export PORT

echo "=========================================================="
echo "⚡ Starting WFM Enterprise Analytics Platform"
echo "   • React + Vite Frontend (Built SPA)"
echo "   • FastAPI Backend on port $PORT"
echo "   • BigQuery Dataset: host-np-project1.wfh"
echo "   • Google ADK Multi-Agent Coordinator"
echo "=========================================================="
echo ""
echo "Access the dashboard at: http://localhost:$PORT"
echo "Press Ctrl+C to stop."
echo ""

python3 backend/main.py
