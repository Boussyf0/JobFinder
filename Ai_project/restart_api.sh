#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Stopping any running API servers...${NC}"
pkill -f "python api.py" || echo -e "${RED}No running API server found${NC}"

# Give the process time to stop
sleep 2

echo -e "${YELLOW}Starting API server on port 8081...${NC}"
cd Scraping
python api.py --port 8081 --debug &
API_PID=$!
cd ..

echo -e "${GREEN}API server restarted! Running on http://localhost:8081${NC}"
echo -e "${YELLOW}PID: ${API_PID}${NC}"
echo ""
echo -e "${YELLOW}To stop the server manually, run: kill ${API_PID}${NC}" 