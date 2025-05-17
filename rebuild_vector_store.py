#!/usr/bin/env python3
"""
Rebuild the vector store with existing data files.
This can fix issues with no jobs being found.
"""

import os
import sys
import pandas as pd
import importlib.util

# Add the Scraping directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'Scraping'))

# Import the JobVectorStore from the correct location
try:
    from Scraping.adzuna_vector_store import JobVectorStore
except ImportError:
    print("Error: Could not import JobVectorStore. Trying alternative import method...")
    try:
        # Try to load the module directly
        spec = importlib.util.spec_from_file_location(
            "adzuna_vector_store",
            os.path.join(os.path.dirname(__file__), "Scraping", "adzuna_vector_store.py")
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        JobVectorStore = module.JobVectorStore
    except Exception as e:
        print(f"Failed to import JobVectorStore: {str(e)}")
        sys.exit(1)

def main():
    """Main function to rebuild the vector store"""
    print("Vector Store Rebuild Tool")
    print("========================")
    
    # Check if fixed data files exist
    data_dir = "adzuna_data"
    fixed_dir = os.path.join(data_dir, "fixed")
    vector_dir = "vector_store"
    
    # Ensure directories exist
    os.makedirs(vector_dir, exist_ok=True)
    
    if not os.path.exists(fixed_dir):
        print(f"Error: Fixed data directory {fixed_dir} does not exist.")
        print("Please run fix_csv_files.py first to prepare the data files.")
        sys.exit(1)
    
    # Find CSV files in the fixed directory
    csv_files = [f for f in os.listdir(fixed_dir) if f.endswith('.csv')]
    
    if not csv_files:
        print(f"Error: No CSV files found in {fixed_dir} directory.")
        sys.exit(1)
    
    print(f"Found {len(csv_files)} fixed CSV files in {fixed_dir}:")
    for file in csv_files:
        print(f"  - {file}")
    
    # Remove old vector store files
    vector_files = [f for f in os.listdir(vector_dir) if f.endswith('.index') or f.endswith('.pkl')]
    if vector_files:
        print(f"\nRemoving {len(vector_files)} old vector store files...")
        for file in vector_files:
            os.remove(os.path.join(vector_dir, file))
    
    # Create a new vector store
    print("\nInitializing new vector store...")
    vector_store = JobVectorStore(data_dir=data_dir, vector_dir=vector_dir)
    
    # Load and process each CSV file
    total_jobs = 0
    
    for csv_file in csv_files:
        file_path = os.path.join(fixed_dir, csv_file)
        print(f"\nProcessing {file_path}...")
        
        try:
            # Read CSV
            df = pd.read_csv(file_path)
            print(f"  Found {len(df)} records in file")
            
            # Ensure required columns exist
            required_columns = ['title', 'company', 'description']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                print(f"  Warning: Missing required columns: {missing_columns}")
                print("  Adding missing columns with default values")
                
                for col in missing_columns:
                    df[col] = "Unknown" if col in ['title', 'company'] else ""
            
            # Add essential fields if missing
            if 'location' not in df.columns:
                df['location'] = "Morocco"
                
            # Add job ID if not present
            if 'id' not in df.columns:
                df['id'] = [f"job-{i+1}" for i in range(len(df))]
                
            # Add remote_friendly flag if not present
            if 'remote_friendly' not in df.columns:
                df['remote_friendly'] = False
                
                # Try to infer remote status from description
                df['remote_friendly'] = df['description'].str.contains(
                    'remote|télétravail|à distance|home office', 
                    case=False, 
                    regex=True
                ).fillna(False)
                
            # Add job_type if not present
            if 'job_type' not in df.columns:
                df['job_type'] = 'CDI'  # Default job type
            
            # Add jobs to vector store
            jobs_added = vector_store.add_jobs_from_dataframe(df)
            total_jobs += jobs_added
            print(f"  Added {jobs_added} jobs to vector store")
            
        except Exception as e:
            print(f"  Error processing {csv_file}: {str(e)}")
    
    # Save the vector store
    print("\nSaving vector store...")
    if vector_store.save():
        print("Vector store saved successfully.")
    else:
        print("Error: Failed to save vector store.")
    
    # Print summary
    print("\nVector Store Rebuild Summary:")
    print(f"  - Total jobs added: {total_jobs}")
    print(f"  - Vector store size: {len(vector_store.jobs)}")
    
    print("\nNext steps:")
    print("1. Restart the API server by running: ./restart_api.sh")
    print("2. Navigate to the Jobs page in your browser")

if __name__ == "__main__":
    main() 