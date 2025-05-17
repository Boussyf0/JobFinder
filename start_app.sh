#!/bin/bash

# Start the job search application (UI + Backend API)
# This script starts both the Next.js UI and Flask backend API

# Terminal colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting JobHub Application...${NC}"

# Check if Python environment is activated
if [[ -z "$VIRTUAL_ENV" ]]; then
  echo -e "${YELLOW}Warning: No Python virtual environment detected.${NC}"
  echo -e "${YELLOW}It's recommended to activate your virtual environment before running this script.${NC}"
  echo -e "${YELLOW}Example: source Env_test/bin/activate${NC}"
  
  # Ask if user wants to continue
  read -p "Continue without virtual environment? (y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Exiting. Please activate your virtual environment and try again.${NC}"
    exit 1
  fi
fi

# Function to cleanup processes on exit
cleanup() {
  echo -e "\n${YELLOW}Shutting down services...${NC}"
  
  # Kill the Flask API server
  if [ ! -z "$API_PID" ]; then
    echo -e "${BLUE}Stopping API server (PID: $API_PID)${NC}"
    kill $API_PID 2>/dev/null
  fi
  
  # Kill the Next.js development server
  if [ ! -z "$UI_PID" ]; then
    echo -e "${BLUE}Stopping UI server (PID: $UI_PID)${NC}"
    kill $UI_PID 2>/dev/null
  fi
  
  echo -e "${GREEN}Application shutdown complete.${NC}"
  exit 0
}

# Set trap for SIGINT (Ctrl+C)
trap cleanup SIGINT

# Check if port 5001 is already in use
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null ; then
  echo -e "${RED}Error: Port 5001 is already in use. The API server needs this port.${NC}"
  echo -e "${YELLOW}You can terminate the process using: lsof -ti:5001 | xargs kill -9${NC}"
  exit 1
fi

# Check if port 3000 is already in use
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
  echo -e "${RED}Error: Port 3000 is already in use. The UI server needs this port.${NC}"
  echo -e "${YELLOW}You can terminate the process using: lsof -ti:3000 | xargs kill -9${NC}"
  exit 1
fi

# Check if Flask is installed
if ! python -c "import flask" &> /dev/null; then
  echo -e "${YELLOW}Flask is not installed. Attempting to install...${NC}"
  pip install flask flask-cors
fi

# Start the Flask API server
echo -e "${BLUE}Starting Flask API server on port 5001...${NC}"
cd Scraping
python api.py --port 5001 &
API_PID=$!

# Wait for API to start
echo -e "${YELLOW}Waiting for API server to start (5 seconds)...${NC}"
sleep 5

# Check if API server is running
if ! kill -0 $API_PID 2>/dev/null; then
  echo -e "${RED}API server failed to start. Check for errors and try again.${NC}"
  exit 1
fi

# Start the Next.js UI
echo -e "${BLUE}Starting Next.js UI server on port 3000...${NC}"
cd ../ui
npm run dev &
UI_PID=$!

# Wait for UI to start
echo -e "${YELLOW}Waiting for UI server to start (5 seconds)...${NC}"
sleep 5

# Check if UI server is running
if ! kill -0 $UI_PID 2>/dev/null; then
  echo -e "${RED}UI server failed to start. Check for errors and try again.${NC}"
  kill $API_PID
  exit 1
fi

echo -e "${GREEN}JobHub application is running:${NC}"
echo -e "${GREEN}  - API: http://localhost:5001${NC}"
echo -e "${GREEN}  - UI:  http://localhost:3000${NC}"
echo -e "${GREEN}  - Debug Page: http://localhost:3000/debug${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Wait for user to press Ctrl+C
wait 