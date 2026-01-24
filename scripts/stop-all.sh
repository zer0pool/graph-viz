#!/bin/bash

# MFE Platform Stop Script
# Usage: ./scripts/stop-all.sh

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PROJECT_ROOT="/home/darkwing/src/lineage_platform"
PID_DIR="$PROJECT_ROOT/pids"

echo -e "${YELLOW}"
echo "╔═══════════════════════════════════════════╗"
echo "║   MFE Platform Shutdown Script v1.0      ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}\n"

# Function to stop a component
stop_component() {
    local name=$1
    local pid_file="$PID_DIR/$name.pid"
    
    if [ ! -f "$pid_file" ]; then
        echo -e "${YELLOW}$name: No PID file found (not running or already stopped)${NC}"
        return
    fi
    
    pid=$(cat "$pid_file")
    
    if ps -p $pid > /dev/null 2>&1; then
        echo -e "${BLUE}Stopping $name (PID: $pid)...${NC}"
        kill $pid
        sleep 2
        
        # Force kill if still running
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "${YELLOW}  Force killing $name...${NC}"
            kill -9 $pid
        fi
        
        echo -e "${GREEN}✓ $name stopped${NC}"
    else
        echo -e "${YELLOW}$name: Process not running (stale PID file)${NC}"
    fi
    
    rm -f "$pid_file"
}

# Function to stop infrastructure
stop_infra() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Stopping Infrastructure (Docker)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    cd "$PROJECT_ROOT"
    docker compose stop mysql-db redis-cache
    
    echo -e "${GREEN}✓ Infrastructure stopped (Docker)${NC}"
}

# Main
MODE=${1:-all}

case $MODE in
    infra)
        stop_infra
        ;;
    backend)
        stop_component "backend"
        ;;
    frontend)
        stop_component "shell"
        stop_component "mfe-catalog"
        stop_component "mfe-lineage"
        ;;
    all)
        # Stop everything in logical reverse order
        stop_component "shell"
        stop_component "mfe-catalog"
        stop_component "mfe-lineage"
        stop_component "backend"
        stop_infra
        ;;
    *)
        echo -e "${RED}Unknown mode: $MODE${NC}"
        echo "Usage: $0 [infra|backend|frontend|all]"
        exit 1
        ;;
esac

# Also kill any remaining node/python processes on these ports if stopping code
if [ "$MODE" != "infra" ]; then
    echo -e "\n${BLUE}Cleaning up any remaining processes...${NC}"
    for port in 5100 5101 5102 5003; do
        pid=$(lsof -ti:$port 2>/dev/null || true)
        if [ ! -z "$pid" ]; then
            echo -e "${YELLOW}Killing process on port $port (PID: $pid)${NC}"
            kill -9 $pid 2>/dev/null || true
        fi
    done
fi

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ Selected components stopped${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
