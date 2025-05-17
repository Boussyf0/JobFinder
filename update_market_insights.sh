#!/bin/bash

# Script to update market insights data
# Recommended to add to cron to run daily with:
# 0 1 * * * /path/to/update_market_insights.sh

# Navigate to the project root directory
cd "$(dirname "$0")"

# Activate Python virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Log file
LOG_FILE="market_insights_update.log"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Start logging
log "Starting market insights data update"

# Ensure we have the required Python packages
if command -v pip3 &>/dev/null; then
    log "Checking required Python packages"
    pip3 install pandas numpy
fi

# Run the market insights data generator
log "Running market insights data generator"
python backend/scripts/analyze_market_data.py

# Check if the generation was successful
if [ $? -eq 0 ]; then
    log "Market insights data generated successfully"
    
    # Check if the data file exists and is accessible by the web server
    if [ -f "market_insights.json" ]; then
        # Ensure the file has proper permissions
        chmod 644 market_insights.json
        log "File permissions set"
        
        # Copy to the appropriate directory for the web app if needed
        # For example, if the web app is in a different directory:
        # cp market_insights.json /path/to/webapp/public/data/
        
        log "Market insights data update completed successfully"
    else
        log "ERROR: market_insights.json file not found"
        exit 1
    fi
else
    log "ERROR: Failed to generate market insights data"
    exit 1
fi

# Get summary statistics
log "Market Insights Summary:"
TOTAL_JOBS=$(grep -o '"totalJobs":[^,]*' market_insights.json | cut -d':' -f2)
AVG_SALARY=$(grep -o '"avgSalary":[^,]*' market_insights.json | cut -d':' -f2)
TOP_LOCATION=$(grep -o '"topLocation":"[^"]*"' market_insights.json | cut -d':' -f2 | tr -d '"')

log "Total Jobs: $TOTAL_JOBS"
log "Average Salary: $AVG_SALARY MAD"
log "Top Location: $TOP_LOCATION"

exit 0 