#!/bin/bash

# MFE Platform Start Script
# Usage: ./scripts/start-all.sh [backend|frontend|all]

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PROJECT_ROOT="/home/darkwing/src/lineage_platform"
LOG_DIR="$PROJECT_ROOT/logs"
PID_DIR="$PROJECT_ROOT/pids"

# Create directories
mkdir -p "$LOG_DIR"
mkdir -p "$PID_DIR"

# Function to start a component
start_component() {
    local name=$1
    local dir=$2
    local command=$3
    local port=$4
    
    echo -e "${BLUE}Starting $name on port $port...${NC}"
    
    # 🔹 명시적으로 포트가 살아있다면 죽이고 시작 (User 요청 적용)
    if [ ! -z "$port" ]; then
        port_pid=$(lsof -ti:$port 2>/dev/null || true)
        if [ ! -z "$port_pid" ]; then
            echo -e "${YELLOW}  Port $port is busy (PID: $port_pid). Killing it...${NC}"
            kill -9 $port_pid 2>/dev/null || true
            sleep 1
        fi
    fi
    
    # Start the component
    cd "$dir"
    nohup bash -c "$command" > "$LOG_DIR/$name.log" 2>&1 &
    echo $! > "$PID_DIR/$name.pid"
    
    echo -e "${GREEN}✓ $name started (PID: $!)${NC}"
    echo -e "  Log: $LOG_DIR/$name.log"
}

# Start Infrastructure (Docker)
start_infra() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Starting Infrastructure (Docker)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    cd "$PROJECT_ROOT"
    docker compose up -d mysql-db redis-cache
    
    echo -e "${GREEN}✓ Infrastructure started (Docker)${NC}"
}

# Function to wait for port
wait_for_port() {
    local port=$1
    local max_wait=30
    local count=0
    
    echo -n "Waiting for port $port to be ready..."
    while ! nc -z localhost $port 2>/dev/null; do
        sleep 1
        count=$((count + 1))
        if [ $count -ge $max_wait ]; then
            echo -e "${RED} timeout!${NC}"
            return 1
        fi
    done
    echo -e "${GREEN} ready!${NC}"
}

# Start Backend
start_backend() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Starting Backend Services${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    start_component "backend" \
        "$PROJECT_ROOT/apps/backend/lineage_manager" \
        ". .venv/bin/activate && PYTHONPATH=.. uvicorn lineage_manager.main:app --reload --host 0.0.0.0 --port 5003" \
        "5003"
    
    wait_for_port 5003
}

# Start Frontend MFEs
start_frontend() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Starting Frontend MFEs${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    # Lineage MFE
    start_component "mfe-lineage" \
        "$PROJECT_ROOT/apps/admin_console/mfe-lineage" \
        "npm run dev" \
        "5101"
    
    sleep 2
    wait_for_port 5101
    
    # Catalog MFE
    start_component "mfe-catalog" \
        "$PROJECT_ROOT/apps/admin_console/mfe-catalog" \
        "npm run dev" \
        "5102"
    
    sleep 2
    wait_for_port 5102
    
    # App
    start_component "app" \
        "$PROJECT_ROOT/apps/admin_console/container" \
        "npm run dev" \
        "5100"
    
    sleep 2
    wait_for_port 5100
}

# Main
MODE=${1:-all}

echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════╗"
echo "║   MFE Platform Startup Script v1.0       ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

case $MODE in
    infra)
        start_infra
        ;;
    backend)
        start_backend
        ;;
    frontend)
        start_frontend
        ;;
    all)
        start_infra
        start_backend
        start_frontend
        ;;
    *)
        echo -e "${RED}Unknown mode: $MODE${NC}"
        echo "Usage: $0 [infra|backend|frontend|all]"
        exit 1
        ;;
esac

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  🚀 All components started!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "📍 Access Points:"
echo -e "    All:     ${BLUE}http://localhost:5100/admin-console${NC}
    Catalog:   ${BLUE}http://localhost:5102/mfe-catalog${NC}
    Lineage:   ${BLUE}http://localhost:5101/mfe-lineage${NC}
"

echo -e "\n📝 Logs:"
echo -e "   All logs: ${YELLOW}$LOG_DIR/${NC}"
echo -e "   View logs: ${YELLOW}tail -f $LOG_DIR/<component>.log${NC}"

echo -e "\n🛑 To stop all components:"
echo -e "   ${YELLOW}./scripts/stop-all.sh${NC}"
echo ""
