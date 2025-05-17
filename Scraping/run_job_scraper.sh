#!/bin/bash
#
# Job Scraper Cron Job Script
# This script is designed to be run by cron every 6 hours to scrape engineering job listings.
#
# Example crontab entry (runs every 6 hours):
# 0 */6 * * * /path/to/Ai_project/Scraping/run_job_scraper.sh >> /path/to/Ai_project/Scraping/logs/cron.log 2>&1
#

# Exit on any error
set -e

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Log directories
LOG_DIR="$SCRIPT_DIR/logs"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="$LOG_DIR/cron_run_$TIMESTAMP.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Handle errors
handle_error() {
    log "ERROR: Job scraper failed with exit code $1"
    exit $1
}

# Trap errors
trap 'handle_error $?' ERR

# Start logging
log "Starting job scraper cron job"
log "Working directory: $SCRIPT_DIR"

# Use conda environment if available
if command -v conda &> /dev/null && [ -n "$CONDA_DEFAULT_ENV" ]; then
    log "Using conda environment: $CONDA_DEFAULT_ENV"
    PYTHON_CMD="python"
# Attempt to activate Python environment if it exists
elif [ -f "$PROJECT_DIR/venv/bin/activate" ]; then
    log "Activating Python virtual environment"
    source "$PROJECT_DIR/venv/bin/activate"
    PYTHON_CMD="python"
elif [ -f "$PROJECT_DIR/.venv/bin/activate" ]; then
    log "Activating Python virtual environment"
    source "$PROJECT_DIR/.venv/bin/activate"
    PYTHON_CMD="python"
else
    log "No virtual environment found, using system Python"
    PYTHON_CMD="python3"
fi

# Change to script directory
cd "$SCRIPT_DIR"

# Make sure the Python scripts are executable
chmod +x "$SCRIPT_DIR/scrape_jobs_cron.py"
chmod +x "$SCRIPT_DIR/update_vector_store.py"

# Run the job scraper
log "Running job scraper script"
$PYTHON_CMD "$SCRIPT_DIR/scrape_jobs_cron.py"

# Check exit status
if [ $? -eq 0 ]; then
    log "Job scraper completed successfully"
else
    log "Job scraper failed"
    exit 1
fi

# Update the vector store (safety check in case it wasn't done in the scrape script)
log "Ensuring vector store is updated"
$PYTHON_CMD "$SCRIPT_DIR/update_vector_store.py" --verbose

# Get current PID of API server if running
API_PID=$(pgrep -f "python api.py" || echo "")

# If API server is running, restart it
if [ -n "$API_PID" ]; then
    log "Stopping existing API server (PID: $API_PID)"
    kill "$API_PID" || true
    sleep 2
fi

# Start the API server in the background
log "Starting API server"
cd "$SCRIPT_DIR"
$PYTHON_CMD api.py --port 8081 &
API_PID=$!
log "API server started with PID: $API_PID"

# Log completion
log "Cron job completed successfully"
exit 0 