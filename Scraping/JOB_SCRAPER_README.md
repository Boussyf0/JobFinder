# Automated Job Scraper

This module provides an automated job scraping solution that runs on a scheduled basis to continuously update the job database with fresh engineering job listings.

## Features

- **Automated Collection**: Scrapes engineering job listings every 6 hours
- **Engineering Focus**: Specialized for Software, Data, Electrical, and Civil Engineering roles
- **Moroccan Market**: Optimized with keywords relevant to the Moroccan job market
- **Vector Store Integration**: Automatically updates the searchable vector database
- **Robust Logging**: Comprehensive logging for monitoring and troubleshooting
- **API Integration**: Automatically restarts the API server to make new data available

## Files

- `scrape_jobs_cron.py`: Main Python script that scrapes job listings
- `update_vector_store.py`: Script that updates the vector database with new job data
- `run_job_scraper.sh`: Shell script wrapper for the cron job
- `test_scraper.sh`: Test script for running the scraper without affecting production
- `CRON_SETUP.md`: Detailed instructions for setting up the cron job
- `SETUP_INSTRUCTIONS.md`: Quick setup instructions for integrating with your app
- `logs/`: Directory containing all scraping logs

## Job Categories

The scraper is configured to collect jobs in these engineering categories:

### Software Engineering
Keywords: software engineer, développeur, full stack, backend, frontend, 
software developer, ingénieur logiciel, développeur web, développeur mobile,
react, angular, node.js, python, java, javascript, devops

### Data Science
Keywords: data scientist, data engineer, machine learning, data analyst,
big data, AI engineer, intelligence artificielle, data mining,
datawarehouse, business intelligence, statistician, NLP

### Electrical Engineering
Keywords: electrical engineer, ingénieur électrique, ingénieur électronique,
power systems, systèmes électriques, automation, automatisation,
embedded systems, systèmes embarqués, telecommunications, télécommunications

### Civil Engineering
Keywords: civil engineer, ingénieur civil, structural engineer, BTP,
construction, génie civil, ingénieur de structures, urban planning,
building engineer, architecture, infrastructure, project manager

## Usage

### Manual Run

To run the scraper manually:

```bash
cd /path/to/Scraping
./run_job_scraper.sh
```

### Testing

To test the scraper without affecting production:

```bash
cd /path/to/Scraping
./test_scraper.sh  # Test without vector store update
./test_scraper.sh --with-vector-update  # Test with vector store update
```

### Vector Store Update Only

To update the vector store without scraping new data:

```bash
cd /path/to/Scraping
python update_vector_store.py --verbose
```

### Monitoring

Check the logs directory for detailed information about each run:

```bash
ls -lt /path/to/Scraping/logs
```

## Workflow

The job scraping process follows this workflow:

1. `scrape_jobs_cron.py` collects job data from sources using the Adzuna API
2. Job data is saved to CSV files in the `adzuna_data` directory
3. `update_vector_store.py` processes this data and updates the vector database
4. The API server is restarted to make the new data available for search

## Customization

To modify the job categories or keywords, edit the `ENGINEERING_SPECIALTIES` dictionary in `scrape_jobs_cron.py`.

## Setup

See `SETUP_INSTRUCTIONS.md` for quick integration steps or `CRON_SETUP.md` for detailed crontab setup instructions. 