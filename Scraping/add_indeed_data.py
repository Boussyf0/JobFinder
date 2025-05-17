#!/usr/bin/env python3
"""
Script to add Indeed jobs data to the vector database.
This imports data from indeed_jobs_detailed.csv into the FAISS vector store.
"""

import os
import shutil
import sys
import pandas as pd
from datetime import datetime
from adzuna_vector_store import JobVectorStore

def log(message):
    """Simple logging with timestamp."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def ensure_directory_exists(directory):
    """Create directory if it doesn't exist."""
    if not os.path.exists(directory):
        os.makedirs(directory)
        log(f"Created directory: {directory}")

def fix_csv_file(source_file, fixed_file):
    """Fix CSV file with inconsistent columns."""
    log(f"Fixing inconsistent CSV format in {source_file}")
    
    try:
        # Read the file as text first to detect and fix issues
        with open(source_file, 'r', encoding='utf-8') as file:
            lines = file.readlines()
        
        # Expected number of columns based on the header
        header = lines[0].strip().split(',')
        expected_columns = len(header)
        log(f"Expected {expected_columns} columns based on header: {header}")
        
        # Fix lines with incorrect number of fields
        fixed_lines = [lines[0]]  # Start with the header
        
        for i, line in enumerate(lines[1:], 1):
            fields = line.strip().split(',')
            
            if len(fields) != expected_columns:
                log(f"Line {i+1} has {len(fields)} fields instead of {expected_columns}")
                
                # For fields with more columns than expected, combine excess columns
                if len(fields) > expected_columns:
                    # Combine excess columns into the last expected column
                    fixed_fields = fields[:expected_columns-1]
                    fixed_fields.append(','.join(fields[expected_columns-1:]))
                    fixed_lines.append(','.join(fixed_fields) + '\n')
                else:
                    # For fewer columns, pad with empty fields
                    fields.extend([''] * (expected_columns - len(fields)))
                    fixed_lines.append(','.join(fields) + '\n')
            else:
                fixed_lines.append(line)
        
        # Write the fixed content to the new file
        with open(fixed_file, 'w', encoding='utf-8') as file:
            file.writelines(fixed_lines)
            
        log(f"Fixed CSV saved to {fixed_file}")
        return True
        
    except Exception as e:
        log(f"Error fixing CSV: {str(e)}")
        return False

def load_csv_safely(file_path):
    """Load CSV with robust error handling."""
    try:
        # First try with standard settings
        log(f"Attempting to load CSV with standard settings")
        return pd.read_csv(file_path)
    except Exception as e:
        log(f"Standard loading failed: {str(e)}")
        
        try:
            # Try with more flexible settings
            log(f"Attempting to load CSV with flexible quoting")
            return pd.read_csv(file_path, quoting=3, escapechar='\\')
        except Exception as e:
            log(f"Flexible loading failed: {str(e)}")
            
            try:
                # Try with error_bad_lines=False (skip bad lines)
                log(f"Attempting to load CSV with error_bad_lines=False")
                return pd.read_csv(file_path, error_bad_lines=False, warn_bad_lines=True)
            except Exception as e:
                log(f"All loading attempts failed: {str(e)}")
                
                # As a last resort, try custom parser
                return None

def main():
    # Configuration
    source_file = "indeed_jobs_detailed.csv"
    data_dir = "../adzuna_data"
    vector_dir = "../vector_store"
    
    # Ensure data directory exists
    ensure_directory_exists(data_dir)
    ensure_directory_exists(vector_dir)
    
    # Check if source file exists
    if not os.path.exists(source_file):
        log(f"Error: Source file not found at {source_file}")
        sys.exit(1)
    
    # Create a fixed version of the CSV
    fixed_file = os.path.join(data_dir, "indeed_jobs_fixed.csv")
    if fix_csv_file(source_file, fixed_file):
        log(f"Successfully fixed CSV format issues")
    else:
        log(f"Warning: Could not fix CSV format issues")
        # Copy the original file as fallback
        dest_file = os.path.join(data_dir, "indeed_jobs_detailed.csv")
        shutil.copy2(source_file, dest_file)
        fixed_file = dest_file
    
    # Load the data directly instead of through the vector store
    df = load_csv_safely(fixed_file)
    if df is None:
        log("Error: Failed to load CSV file with all methods")
        sys.exit(1)
    
    log(f"Successfully loaded CSV with {len(df)} rows and {len(df.columns)} columns")
    log(f"Columns: {', '.join(df.columns)}")
    
    # Initialize vector store
    log("Initializing vector store...")
    vector_store = JobVectorStore(data_dir=data_dir, vector_dir=vector_dir)
    
    # Try to load existing database
    loaded = vector_store.load()
    if loaded:
        log(f"Loaded existing vector store with {len(vector_store.jobs)} jobs")
    else:
        log("No existing vector store found. Creating new one.")
    
    # Add jobs from the loaded dataframe
    log(f"Adding jobs from dataframe...")
    added = vector_store.add_jobs_from_dataframe(df)
    
    if added > 0:
        log(f"Successfully added {added} jobs to vector store")
        
        # Save the updated vector store
        vector_store.save()
        log("Vector store saved to disk")
        
        # Show some statistics
        stats = vector_store.get_job_statistics()
        log(f"Total jobs in database: {stats['total_jobs']}")
        
        # Show top specialties
        if 'specialties' in stats and stats['specialties']:
            log("\nJobs by specialty:")
            for specialty, count in sorted(stats['specialties'].items(), key=lambda x: x[1], reverse=True)[:5]:
                if specialty:  # Skip empty specialty
                    log(f"  {specialty}: {count} jobs")
        
        # Example search
        log("\nExample search for 'developer':")
        results = vector_store.search_similar_jobs("developer", k=3)
        for i, job in enumerate(results, 1):
            log(f"{i}. {job.get('title', 'Unknown')} at {job.get('company', 'Unknown')}")
    else:
        log("No jobs were added to the vector store")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nProcess interrupted by user")
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc() 