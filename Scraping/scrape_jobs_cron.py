#!/usr/bin/env python3
"""
Job Scraping Cron Script

This script is designed to be run as a cron job every 6 hours to scrape
engineering job listings. It collects job listings for specified engineering
categories and updates the vector store for searching.

Categories scraped:
- Software Engineering
- Data Science
- Electrical Engineering
- Civil Engineering

Usage:
    python3 scrape_jobs_cron.py [--debug] [--no-vector-update]

Options:
    --debug             Print detailed debug information
    --no-vector-update  Skip updating the vector store (only scrape and save raw data)
"""

import os
import sys
import time
import json
import argparse
import logging
from datetime import datetime
import pandas as pd
import random
import traceback

# Import our specialized modules
from adzuna_solution_fixed import AdzunaSolution

# Configure logging
log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
os.makedirs(log_dir, exist_ok=True)

# Log file with timestamp
log_file = os.path.join(log_dir, f"job_scrape_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Engineering job categories and related keywords
ENGINEERING_SPECIALTIES = {
    "software_engineering": [
        "software engineer", "développeur", "full stack", "backend", "frontend", 
        "software developer", "ingénieur logiciel", "développeur web", "développeur mobile",
        "react", "angular", "node.js", "python", "java", "javascript", "devops"
    ],
    "data_science": [
        "data scientist", "data engineer", "machine learning", "data analyst",
        "big data", "AI engineer", "intelligence artificielle", "data mining",
        "datawarehouse", "business intelligence", "statistician", "NLP"
    ],
    "electrical_engineering": [
        "electrical engineer", "ingénieur électrique", "ingénieur électronique",
        "power systems", "systèmes électriques", "automation", "automatisation",
        "embedded systems", "systèmes embarqués", "telecommunications", "télécommunications"
    ],
    "civil_engineering": [
        "civil engineer", "ingénieur civil", "structural engineer", "BTP",
        "construction", "génie civil", "ingénieur de structures", "urban planning",
        "building engineer", "architecture", "infrastructure", "project manager"
    ]
}

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Job scraping cron script')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    parser.add_argument('--no-vector-update', action='store_true', 
                       help='Skip updating the vector store')
    return parser.parse_args()

def fetch_jobs(output_dir="adzuna_data", max_pages=3, test_mode=False):
    """Fetch jobs from Adzuna API for engineering specialties."""
    logger.info("Starting engineering job data collection")
    
    # Initialize API solution
    adzuna = AdzunaSolution(output_dir=output_dir)
    
    # Run the analysis
    start_time = time.time()
    
    try:
        results = adzuna.run_analysis(ENGINEERING_SPECIALTIES, max_pages=max_pages)
        elapsed = time.time() - start_time
        
        logger.info(f"Job collection completed in {elapsed:.2f} seconds")
        logger.info(f"Collected {results['job_count']} unique jobs across {len(results['specialties'])} specialties")
        
        # Print country statistics
        if 'countries' in results:
            logger.info("Jobs by country:")
            for country, count in results['countries'].items():
                logger.info(f"  {country.upper()}: {count} jobs")
        
        return True, results
    
    except Exception as e:
        logger.error(f"Error fetching jobs: {str(e)}")
        logger.error(traceback.format_exc())
        return False, {"job_count": 0, "error": str(e)}

def update_vector_store():
    """Update the vector store using the dedicated script."""
    logger.info("Updating vector store with new job data")
    
    try:
        from update_vector_store import update_vector_store as update_fn
        
        success = update_fn(verbose=True)
        
        if success:
            logger.info("Vector store updated successfully")
            return True, {"success": True}
        else:
            logger.error("Failed to update vector store")
            return False, {"success": False, "error": "Update function returned False"}
    
    except Exception as e:
        logger.error(f"Error updating vector store: {str(e)}")
        logger.error(traceback.format_exc())
        return False, {"error": str(e)}

def create_run_report(fetch_result, vector_result, args):
    """Create a run report with results summary."""
    report = {
        "timestamp": datetime.now().isoformat(),
        "fetch_success": fetch_result[0],
        "fetch_data": fetch_result[1],
        "vector_update_success": vector_result[0] if vector_result else None,
        "vector_data": vector_result[1] if vector_result else None,
        "args": vars(args)
    }
    
    # Save report to file
    report_file = os.path.join(log_dir, f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    logger.info(f"Run report saved to {report_file}")
    return report

def main():
    """Main function to run the job scraping process."""
    args = parse_args()
    
    # Set logging level
    if args.debug:
        logger.setLevel(logging.DEBUG)
        logger.debug("Debug mode enabled")
    
    # Create output directories if they don't exist
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "adzuna_data")
    
    os.makedirs(data_dir, exist_ok=True)
    
    logger.info("=" * 60)
    logger.info(f"Starting job scraping run at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Step 1: Fetch jobs from API
    fetch_result = fetch_jobs(output_dir=data_dir)
    
    # Step 2: Update vector store (if not disabled)
    vector_result = None
    if not args.no_vector_update and fetch_result[0]:
        vector_result = update_vector_store()
    
    # Create run report
    report = create_run_report(fetch_result, vector_result, args)
    
    # Final log
    if fetch_result[0]:
        logger.info(f"Job scraping completed successfully. Collected {fetch_result[1]['job_count']} jobs.")
    else:
        logger.error("Job scraping failed.")
    
    logger.info("=" * 60)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logger.critical(f"Unhandled exception: {str(e)}")
        logger.critical(traceback.format_exc())
        sys.exit(1) 