#!/bin/bash

# Setup script for development environment
# This script starts both the API server and the Next.js UI

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up development environment...${NC}"

# Install dependencies
echo -e "${YELLOW}Installing API server dependencies...${NC}"
pip install -r Scraping/requirements.txt

# Make sure directories exist
mkdir -p vector_store
mkdir -p adzuna_data

# Install UI dependencies
echo -e "${YELLOW}Setting up Next.js UI...${NC}"
cd ui
npm install
cd ..

# Start API server in background
echo -e "${YELLOW}Starting API server on port 8081...${NC}"
cd Scraping
python api.py --port 8081 --debug &
API_PID=$!
cd ..

# Give the API server time to start
echo -e "${YELLOW}Waiting for API server to start...${NC}"
sleep 3

# Start Next.js dev server
echo -e "${YELLOW}Starting Next.js development server on port 3000...${NC}"
cd ui
npm run dev &
UI_PID=$!
cd ..

echo -e "${GREEN}Development environment is ready!${NC}"
echo -e "${GREEN}API: http://localhost:8081${NC}"
echo -e "${GREEN}UI: http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"

# Handle SIGINT (Ctrl+C) to kill both servers
trap "kill $API_PID $UI_PID; exit" INT

# Wait for both processes
wait 