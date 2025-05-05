#!/usr/bin/env python3
"""
Update Vector Store with Newly Scraped Jobs

This script updates the vector store with newly scraped engineering job data.
It's designed to be run after the scrape_jobs_cron.py script has collected new data.

Usage:
    python update_vector_store.py [--verbose]

Options:
    --verbose    Print detailed information during processing
"""

import os
import sys
import argparse
import logging
from datetime import datetime

# Import our specialized modules
from adzuna_vector_store import JobVectorStore

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Update vector store with newly scraped jobs')
    parser.add_argument('--verbose', action='store_true', help='Print detailed information')
    return parser.parse_args()

def update_vector_store(verbose=False):
    """Update the vector store with newly scraped job data."""
    # Paths
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "adzuna_data")
    vector_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vector_store")
    
    # Ensure directories exist
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(vector_dir, exist_ok=True)
    
    # Set log level
    if verbose:
        logger.setLevel(logging.DEBUG)
        logger.debug("Verbose mode enabled")
    
    # Initialize vector store
    logger.info("Initializing vector store")
    vector_store = JobVectorStore(data_dir=data_dir, vector_dir=vector_dir)
    
    # Try to load existing vector store
    loaded = vector_store.load()
    if loaded:
        logger.info(f"Loaded existing vector store with {len(vector_store.jobs)} jobs")
        
        # Get initial statistics
        initial_stats = vector_store.get_job_statistics()
        logger.info(f"Initial stats: {initial_stats['total_jobs']} jobs, {initial_stats['remote_jobs']} remote")
    else:
        logger.warning("Could not load existing vector store, creating new one")
    
    # Add new jobs from the data directory
    logger.info("Adding new jobs from the data directory")
    try:
        start_time = datetime.now()
        added = vector_store.add_jobs_from_directory(data_dir)
        elapsed = (datetime.now() - start_time).total_seconds()
        
        logger.info(f"Added {added} new jobs to vector store in {elapsed:.2f} seconds")
        
        # Save the vector store if jobs were added
        if added > 0:
            logger.info("Saving updated vector store")
            if vector_store.save():
                logger.info("Vector store saved successfully")
            else:
                logger.error("Failed to save vector store")
        else:
            logger.info("No new jobs were added, vector store remains unchanged")
    
    except Exception as e:
        logger.error(f"Error updating vector store: {str(e)}")
        return False
    
    # Get updated statistics
    stats = vector_store.get_job_statistics()
    logger.info(f"Updated vector store stats: {stats['total_jobs']} total jobs")
    logger.info(f"Remote jobs: {stats['remote_jobs']} ({stats['remote_jobs'] / max(1, stats['total_jobs']) * 100:.1f}%)")
    
    # Log job categories
    if 'specialties' in stats and verbose:
        logger.info("Jobs by specialty:")
        for specialty, count in sorted(stats['specialties'].items(), key=lambda x: x[1], reverse=True)[:10]:
            logger.info(f"  {specialty}: {count} jobs")
    
    # Log countries
    if 'countries' in stats and verbose:
        logger.info("Jobs by country:")
        for country, count in sorted(stats['countries'].items(), key=lambda x: x[1], reverse=True)[:5]:
            logger.info(f"  {country.upper()}: {count} jobs")
    
    return True

def main():
    """Main function."""
    args = parse_args()
    
    logger.info("=" * 60)
    logger.info(f"Starting vector store update at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    success = update_vector_store(verbose=args.verbose)
    
    if success:
        logger.info("Vector store update completed successfully")
    else:
        logger.error("Vector store update failed")
        sys.exit(1)
    
    logger.info("=" * 60)

if __name__ == "__main__":
    main() 