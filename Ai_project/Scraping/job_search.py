#!/usr/bin/env python3
"""
Job Search CLI - Query the vector database for job listings
"""

import argparse
import sys
from adzuna_vector_store import JobVectorStore

def setup_argparse():
    """Setup command line argument parsing."""
    parser = argparse.ArgumentParser(
        description='Job Search CLI - Search for jobs in the vector database',
        formatter_class=argparse.RawTextHelpFormatter
    )
    
    parser.add_argument('query', type=str, nargs='?',
                       help='Search query (e.g., "software engineer")')
    
    # Search modes
    parser.add_argument('--title', action='store_true',
                       help='Search by job title')
    parser.add_argument('--remote', action='store_true',
                       help='Search for remote jobs')
    parser.add_argument('--morocco', action='store_true',
                       help='Search for Morocco-relevant jobs')
    parser.add_argument('--keywords', type=str, nargs='+',
                       help='Search for specific keywords')
    
    # Options
    parser.add_argument('--results', '-k', type=int, default=5,
                       help='Number of results to return (default: 5)')
    parser.add_argument('--full', action='store_true',
                       help='Show full job details')
    parser.add_argument('--stats', action='store_true',
                       help='Show database statistics')
    
    # Paths
    parser.add_argument('--data-dir', type=str, default='adzuna_data',
                       help='Data directory path (default: adzuna_data)')
    parser.add_argument('--vector-dir', type=str, default='vector_store',
                       help='Vector store directory path (default: vector_store)')
    
    return parser.parse_args()

def display_job(job, full=False):
    """Display a job with appropriate formatting."""
    title = job.get('title', 'Untitled')
    company = job.get('company', 'Unknown Company')
    location = job.get('location', 'Location not specified')
    score = job.get('similarity_score', 0)
    
    print(f"\n{title} at {company}")
    print(f"Location: {location}")
    print(f"Similarity Score: {score:.2f}")
    
    # Add tags
    tags = []
    if job.get('remote_friendly', False):
        tags.append("REMOTE")
    if job.get('international', False):
        tags.append("INTERNATIONAL")
    if tags:
        print(f"Tags: {', '.join(tags)}")
    
    # Show specialty and source if available
    if 'specialty' in job and job['specialty']:
        print(f"Specialty: {job['specialty']}")
    if 'source_country' in job and job['source_country']:
        print(f"Source: {job['source_country'].upper()}")
    
    # Show full details if requested
    if full:
        if 'salary_min' in job and job['salary_min']:
            print(f"Salary Range: {job['salary_min']} - {job['salary_max']}")
        if 'description' in job and job['description']:
            print("\nDescription:")
            print("------------")
            description = job['description']
            # Truncate long descriptions
            if len(description) > 500:
                description = description[:500] + "..."
            print(description)
        if 'redirect_url' in job and job['redirect_url']:
            print(f"\nURL: {job['redirect_url']}")
    
    print("-" * 50)

def main():
    args = setup_argparse()
    
    # Initialize vector store
    try:
        vector_store = JobVectorStore(
            data_dir=args.data_dir,
            vector_dir=args.vector_dir
        )
    except Exception as e:
        print(f"Error initializing vector store: {str(e)}")
        sys.exit(1)
    
    # Load vector store
    if not vector_store.load():
        print("Error: Failed to load vector database. Make sure it exists.")
        sys.exit(1)
    
    print(f"Successfully loaded vector database with {len(vector_store.jobs)} jobs")
    
    # Show stats if requested
    if args.stats:
        stats = vector_store.get_job_statistics()
        print("\n=== JOB STATISTICS ===")
        print(f"Total jobs: {stats['total_jobs']}")
        print(f"Remote jobs: {stats['remote_jobs']} ({stats['remote_jobs']/max(1, stats['total_jobs'])*100:.1f}%)")
        print(f"International jobs: {stats['international_jobs']} ({stats['international_jobs']/max(1, stats['total_jobs'])*100:.1f}%)")
        
        if 'specialties' in stats and stats['specialties']:
            print("\nTop Specialties:")
            for specialty, count in sorted(stats['specialties'].items(), key=lambda x: x[1], reverse=True)[:5]:
                if specialty:
                    print(f"  {specialty}: {count} jobs")
        
        if 'countries' in stats and stats['countries']:
            print("\nJobs by Source Country:")
            for country, count in sorted(stats['countries'].items(), key=lambda x: x[1], reverse=True):
                if country:
                    print(f"  {country.upper()}: {count} jobs")
        
        # If stats only, exit
        if not args.query and not args.keywords:
            return
    
    # Execute search based on arguments
    results = []
    
    if args.keywords:
        print(f"\nSearching for jobs containing keywords: {', '.join(args.keywords)}")
        results = vector_store.search_by_keywords(
            args.keywords, 
            k=args.results,
            require_all=False
        )
    elif args.title and args.query:
        print(f"\nSearching for jobs with title similar to: {args.query}")
        results = vector_store.search_by_job_title(args.query, k=args.results)
    elif args.remote and args.query:
        print(f"\nSearching for remote jobs matching: {args.query}")
        results = vector_store.search_remote_jobs(args.query, k=args.results)
    elif args.morocco and args.query:
        print(f"\nSearching for Morocco-relevant jobs matching: {args.query}")
        results = vector_store.search_morocco_relevant(args.query, k=args.results)
    elif args.query:
        print(f"\nSearching for jobs matching: {args.query}")
        results = vector_store.search_similar_jobs(args.query, k=args.results)
    elif not args.stats:
        print("Error: No search criteria provided. Use --help for usage information.")
        sys.exit(1)
    
    # Display results
    if results:
        print(f"\nFound {len(results)} matching jobs:")
        for job in results:
            display_job(job, args.full)
    elif args.query or args.keywords:
        print("No matching jobs found.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nSearch interrupted by user")
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc() 