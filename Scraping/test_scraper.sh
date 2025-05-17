#!/bin/bash
#
# Test script for the job scraper
# This script runs the job scraper in debug mode without restarting the API server
#

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Parse command line arguments
TEST_VECTOR_STORE=false
while [ "$#" -gt 0 ]; do
    case "$1" in
        --with-vector-update)
            TEST_VECTOR_STORE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "===== Testing Job Scraper ====="
echo "Working directory: $SCRIPT_DIR"
if [ "$TEST_VECTOR_STORE" = true ]; then
    echo "Mode: With vector store update"
else
    echo "Mode: Without vector store update (use --with-vector-update to test vector store updates)"
fi

# Change to script directory
cd "$SCRIPT_DIR"

# Make sure the Python scripts are executable
chmod +x "$SCRIPT_DIR/scrape_jobs_cron.py"
chmod +x "$SCRIPT_DIR/update_vector_store.py"

# Run the job scraper in debug mode
echo "Running job scraper in test mode..."
if [ "$TEST_VECTOR_STORE" = true ]; then
    python scrape_jobs_cron.py --debug
else
    python scrape_jobs_cron.py --debug --no-vector-update
fi

# Check exit status
if [ $? -eq 0 ]; then
    echo "Job scraper test completed successfully"
else
    echo "Job scraper test failed"
    exit 1
fi

# If testing with vector update, run the vector update script directly
if [ "$TEST_VECTOR_STORE" = true ]; then
    echo "===== Testing Vector Store Update ====="
    python update_vector_store.py --verbose
    
    # Check exit status
    if [ $? -eq 0 ]; then
        echo "Vector store update test completed successfully"
    else
        echo "Vector store update test failed"
        exit 1
    fi
fi

echo "===== Test Complete ====="
echo "Check the logs directory for detailed output"
echo "Log directory: $SCRIPT_DIR/logs"

# List the most recent log files
echo "Recent log files:"
ls -lt "$SCRIPT_DIR/logs" | head -5

exit 0 