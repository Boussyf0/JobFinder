# Job Scraper Cron Job Setup

This document provides instructions for setting up the automated job scraper to run every 6 hours.

## Overview

The automated job scraper will:

1. Scrape engineering job listings every 6 hours from various sources
2. Update the vector store with new job data using the dedicated update script
3. Restart the API server to make new data available to the application
4. Keep logs of each run for monitoring and troubleshooting

## Requirements

- Linux/macOS server with cron
- Python 3.7+
- All dependencies installed (see `requirements.txt`)

## Files

- `scrape_jobs_cron.py`: The main Python script that scrapes job listings
- `update_vector_store.py`: Script that updates the vector database with new job data
- `run_job_scraper.sh`: Shell script wrapper that sets up the environment and runs the scripts
- `/logs`: Directory where logs will be stored

## Setting Up the Cron Job

### 1. Ensure Scripts Are Executable

Make sure all scripts have executable permissions:

```bash
chmod +x scrape_jobs_cron.py update_vector_store.py run_job_scraper.sh
```

### 2. Test the Scripts

Before setting up the cron job, test the scripts manually to make sure they work properly:

```bash
# Test without updating the vector store
./test_scraper.sh

# Test with vector store update
./test_scraper.sh --with-vector-update
```

Check the output and logs to ensure everything is working correctly.

### 3. Edit the Crontab

Open the crontab editor:

```bash
crontab -e
```

Add the following line to run the job every 6 hours (at 00:00, 06:00, 12:00, and 18:00):

```
0 */6 * * * /absolute/path/to/Ai_project/Scraping/run_job_scraper.sh >> /absolute/path/to/Ai_project/Scraping/logs/cron.log 2>&1
```

Replace `/absolute/path/to/` with the actual absolute path to your project.

### 4. Verify the Cron Job Setup

List your cron jobs to verify the job is set up correctly:

```bash
crontab -l
```

You should see your job listed.

## Monitoring the Cron Job

### Log Files

The cron job creates several types of log files:

1. **Cron run logs**: Located at `logs/cron_run_<timestamp>.log`
   - Contains information about the script execution environment

2. **Job scrape logs**: Located at `logs/job_scrape_<timestamp>.log`
   - Contains detailed information about the job scraping process

3. **Run reports**: Located at `logs/report_<timestamp>.json`
   - Contains structured JSON data about the job scraping results

### Checking Status

To check if the cron job is running properly:

1. Check the log files:
   ```bash
   tail -f /path/to/Ai_project/Scraping/logs/cron.log
   ```

2. Check the most recent run report:
   ```bash
   ls -t /path/to/Ai_project/Scraping/logs/report_*.json | head -1 | xargs cat
   ```

3. Manually update the vector store:
   ```bash
   cd /path/to/Ai_project/Scraping
   ./update_vector_store.py --verbose
   ```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure the script files have executable permissions.
   ```bash
   chmod +x scrape_jobs_cron.py update_vector_store.py run_job_scraper.sh
   ```

2. **Path Issues**: Make sure all paths in the cron job are absolute, not relative.

3. **Python Environment**: The script tries to activate a virtual environment if available. If your environment is in a different location, modify `run_job_scraper.sh`.

4. **Dependencies**: Make sure all required Python packages are installed.

5. **API Server Issues**: If the API server fails to start, check the logs for specific errors.

### Getting Help

If you encounter issues that you can't resolve:

1. Check the log files for error messages
2. Try running the script manually to see if it produces the same error
3. Check the system resources (disk space, memory, etc.)

## Engineering Job Categories

The job scraper is configured to scrape jobs in the following engineering categories:

- **Software Engineering**: Software developer, full stack, backend, frontend, etc.
- **Data Science**: Data scientist, data engineer, machine learning, AI, etc.
- **Electrical Engineering**: Electrical engineer, power systems, automation, etc.
- **Civil Engineering**: Civil engineer, structural engineer, construction, etc.

To modify the categories or keywords, edit the `ENGINEERING_SPECIALTIES` dictionary in `scrape_jobs_cron.py`. 