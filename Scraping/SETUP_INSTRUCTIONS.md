# Job Scraper Integration Setup

This document provides instructions for integrating the automated job scraper into your application.

## Files Included

The following files have been added to your project:
- `Scraping/scrape_jobs_cron.py`: Main Python script that collects engineering job data
- `Scraping/run_job_scraper.sh`: Shell script wrapper for running the Python script
- `Scraping/CRON_SETUP.md`: Detailed instructions for setting up the cron job
- `Scraping/logs/`: Directory for logs (created automatically)

## Setup Instructions

### 1. Make Scripts Executable

The scripts have been made executable. If needed, you can do this again with:

```bash
chmod +x Scraping/scrape_jobs_cron.py Scraping/run_job_scraper.sh
```

### 2. Set Up the Cron Job

To set up the cron job to run every 6 hours, run:

```bash
crontab -e
```

Then add the following line:

```
0 */6 * * * /Users/abderrahim_boussyf/Ai_project/Scraping/run_job_scraper.sh >> /Users/abderrahim_boussyf/Ai_project/Scraping/logs/cron.log 2>&1
```

Save and exit the editor.

### 3. Verify Cron Job Setup

To verify the cron job is set up correctly:

```bash
crontab -l
```

You should see the line you added.

## Testing the Scripts

To test the scripts manually:

```bash
cd /Users/abderrahim_boussyf/Ai_project/Scraping
./run_job_scraper.sh
```

## Monitoring

- Logs are stored in `Scraping/logs/`
- Check `cron.log` for overall execution logs
- Individual run logs have timestamps in their filenames

Refer to `Scraping/CRON_SETUP.md` for more detailed information on monitoring and troubleshooting.

## Job Categories

The job scraper is configured to collect jobs for:
- Software Engineering
- Data Science
- Electrical Engineering
- Civil Engineering

To modify these categories, edit the `ENGINEERING_SPECIALTIES` dictionary in `scrape_jobs_cron.py`. 