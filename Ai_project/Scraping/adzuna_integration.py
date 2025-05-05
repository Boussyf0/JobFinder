#!/usr/bin/env python3
"""
Adzuna Integration Script - Combines the Adzuna API solution with FAISS vector database.
This script provides a complete workflow for fetching, storing, and searching job data.
"""

import os
import argparse
import time
from datetime import datetime

# Import our custom modules
from adzuna_solution_fixed import AdzunaSolution, JOB_SPECIALTIES, TEST_SPECIALTIES
from adzuna_vector_store import JobVectorStore

def setup_argparse():
    """Set up command line argument parsing."""
    parser = argparse.ArgumentParser(description='Adzuna Job Search and Vector Store Integration')
    
    # Main operation modes
    parser.add_argument('--fetch', action='store_true', 
                        help='Fetch new job data from Adzuna API')
    parser.add_argument('--search', action='store_true',
                        help='Search in the vector database')
    parser.add_argument('--stats', action='store_true',
                        help='Show statistics about stored jobs')
    
    # Fetch options
    parser.add_argument('--test', action='store_true',
                        help='Run in test mode with limited specialties and pages')
    parser.add_argument('--max-pages', type=int, default=2,
                        help='Maximum pages to fetch per keyword')
    
    # Search options
    parser.add_argument('--query', type=str,
                        help='Search query for finding jobs')
    parser.add_argument('--remote', action='store_true',
                        help='Search for remote jobs')
    parser.add_argument('--morocco', action='store_true',
                        help='Search for Morocco-relevant jobs')
    parser.add_argument('--keywords', type=str, nargs='+',
                        help='Specific keywords to search for')
    parser.add_argument('--job-title', type=str,
                        help='Search by job title')
    parser.add_argument('--results', type=int, default=10,
                        help='Number of results to return')
    
    # Common options
    parser.add_argument('--output-dir', type=str, default='adzuna_data',
                        help='Directory for output files')
    parser.add_argument('--vector-dir', type=str, default='vector_store',
                        help='Directory for vector store files')
    
    return parser.parse_args()

def log(message):
    """Simple logging function with timestamp."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def fetch_jobs(args):
    """Fetch jobs from Adzuna API and store them."""
    log("Starting job data collection from Adzuna API")
    
    # Initialize API solution
    adzuna = AdzunaSolution(output_dir=args.output_dir)
    
    # Select specialties based on test mode
    specialties = TEST_SPECIALTIES if args.test else JOB_SPECIALTIES
    
    # Run the analysis
    start_time = time.time()
    results = adzuna.run_analysis(specialties, max_pages=args.max_pages)
    elapsed = time.time() - start_time
    
    log(f"Job collection completed in {elapsed:.2f} seconds")
    log(f"Collected {results['job_count']} unique jobs across {len(results['specialties'])} specialties")
    
    # Print country statistics
    if 'countries' in results:
        log("Jobs by country:")
        for country, count in results['countries'].items():
            log(f"  {country.upper()}: {count} jobs")
    
    return True

def build_vector_store(args):
    """Build or update the vector store from collected data."""
    log("Building/updating vector database from collected job data")
    
    # Initialize vector store
    vector_store = JobVectorStore(data_dir=args.output_dir, vector_dir=args.vector_dir)
    
    # Try to load existing database
    loaded = vector_store.load()
    if loaded:
        log(f"Loaded existing vector store with {len(vector_store.jobs)} jobs")
    
    # Add new jobs from directory
    start_time = time.time()
    added = vector_store.add_jobs_from_directory()
    elapsed = time.time() - start_time
    
    if added > 0:
        log(f"Added {added} new jobs to vector store in {elapsed:.2f} seconds")
        # Save updates
        vector_store.save()
        log("Vector store saved to disk")
    else:
        log("No new jobs were added to the vector store")
    
    return vector_store

def show_job_statistics(vector_store):
    """Display statistics about jobs in the vector store."""
    stats = vector_store.get_job_statistics()
    
    log("\n===== JOB STATISTICS =====")
    log(f"Total jobs in database: {stats['total_jobs']}")
    log(f"Remote jobs: {stats['remote_jobs']} ({stats['remote_jobs'] / max(1, stats['total_jobs']) * 100:.1f}%)")
    log(f"International jobs: {stats['international_jobs']} ({stats['international_jobs'] / max(1, stats['total_jobs']) * 100:.1f}%)")
    
    if 'specialties' in stats and stats['specialties']:
        log("\nJobs by specialty:")
        for specialty, count in sorted(stats['specialties'].items(), key=lambda x: x[1], reverse=True):
            if specialty:  # Skip empty specialty
                log(f"  {specialty}: {count} jobs")
    
    if 'countries' in stats and stats['countries']:
        log("\nJobs by source country:")
        for country, count in sorted(stats['countries'].items(), key=lambda x: x[1], reverse=True):
            if country:  # Skip unknown country
                log(f"  {country.upper()}: {count} jobs")

def perform_search(vector_store, args):
    """Perform the requested search operation."""
    if not args.query and not args.keywords and not args.job_title:
        log("No search criteria provided. Please specify --query, --keywords, or --job-title")
        return
    
    log("\n===== SEARCH RESULTS =====")
    
    results = []
    
    # Search based on provided criteria
    if args.keywords:
        log(f"Searching for jobs with keywords: {', '.join(args.keywords)}")
        results = vector_store.search_by_keywords(args.keywords, k=args.results)
    elif args.job_title:
        log(f"Searching for jobs with title similar to: {args.job_title}")
        results = vector_store.search_by_job_title(args.job_title, k=args.results)
    elif args.remote and args.query:
        log(f"Searching for remote jobs matching: {args.query}")
        results = vector_store.search_remote_jobs(args.query, k=args.results)
    elif args.morocco and args.query:
        log(f"Searching for Morocco-relevant jobs matching: {args.query}")
        results = vector_store.search_morocco_relevant(args.query, k=args.results)
    elif args.query:
        log(f"Searching for jobs similar to: {args.query}")
        results = vector_store.search_similar_jobs(args.query, k=args.results)
    
    # Display results
    if results:
        log(f"Found {len(results)} matching jobs:\n")
        for i, job in enumerate(results, 1):
            score = job.get('similarity_score', 0)
            title = job.get('title', 'Untitled')
            company = job.get('company', 'Unknown Company')
            location = job.get('location', 'Unknown Location')
            
            log(f"{i}. {title} at {company}")
            log(f"   Location: {location}")
            log(f"   Similarity: {score:.2f}")
            
            # Add indicators for remote/international jobs
            indicators = []
            if job.get('remote_friendly', False):
                indicators.append("REMOTE")
            if job.get('international', False):
                indicators.append("INTERNATIONAL")
            if indicators:
                log(f"   Tags: {', '.join(indicators)}")
            
            log("")  # Empty line between results
    else:
        log("No matching jobs found.")

def main():
    """Main function to run the integration workflow."""
    args = setup_argparse()
    
    # Ensure output directories exist
    os.makedirs(args.output_dir, exist_ok=True)
    os.makedirs(args.vector_dir, exist_ok=True)
    
    # Fetch data if requested
    if args.fetch:
        fetch_jobs(args)
    
    # Build/update vector store (needed for search and stats)
    if args.search or args.stats:
        vector_store = build_vector_store(args)
        
        # Show statistics if requested
        if args.stats:
            show_job_statistics(vector_store)
        
        # Perform search if requested
        if args.search:
            perform_search(vector_store, args)
    
    log("Operation completed successfully")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nProcess interrupted by user")
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc() 