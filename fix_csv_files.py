#!/usr/bin/env python3
"""
Fix CSV file parsing issues and prepare them for the vector store.
"""

import os
import sys
import pandas as pd
import json
import re
import csv
from datetime import datetime

def fix_csv_file(input_path, output_path=None):
    """
    Fix a CSV file with parsing issues by reading it properly and writing it in a cleaner format.
    
    Args:
        input_path: Path to the input CSV file
        output_path: Path to write the fixed CSV file (defaults to input_path with _fixed suffix)
    
    Returns:
        Path to the fixed CSV file
    """
    if output_path is None:
        # Create output path by adding _fixed before the extension
        base, ext = os.path.splitext(input_path)
        output_path = f"{base}_fixed{ext}"
    
    print(f"Fixing CSV file: {input_path}")
    print(f"Output will be written to: {output_path}")
    
    try:
        # First try to detect the dialect
        with open(input_path, 'r', newline='', encoding='utf-8') as f:
            sample = f.read(4096)
            dialect = csv.Sniffer().sniff(sample)
            f.seek(0)
            
            # Read the file with the detected dialect
            reader = csv.reader(f, dialect)
            headers = next(reader)
            
            print(f"Detected {len(headers)} columns: {headers}")
            
            # Read all rows
            rows = []
            for i, row in enumerate(reader):
                # Skip empty rows
                if not row:
                    continue
                
                # Handle rows with too many columns
                if len(row) > len(headers):
                    print(f"Row {i+2} has {len(row)} columns (expected {len(headers)})")
                    # Combine extra columns
                    extra = ' '.join(row[len(headers):])
                    row = row[:len(headers)-1] + [row[len(headers)-1] + ' ' + extra]
                
                # Handle rows with too few columns
                while len(row) < len(headers):
                    row.append('')
                
                rows.append(row)
            
            # Create DataFrame
            df = pd.DataFrame(rows, columns=headers)
            
            # Clean up data
            for col in df.columns:
                if df[col].dtype == object:
                    # Replace newlines and quotes that might cause issues
                    df[col] = df[col].str.replace('\n', ' ')
                    df[col] = df[col].str.replace('\r', ' ')
                    df[col] = df[col].str.replace('"', "'")
            
            # Add ID column if not present
            if 'id' not in df.columns:
                df['id'] = [f"job-{i+1}" for i in range(len(df))]
            
            # Write cleaned data
            df.to_csv(output_path, index=False, quoting=csv.QUOTE_NONNUMERIC)
            
            print(f"Successfully fixed CSV file. Found {len(df)} rows.")
            return output_path
    
    except Exception as e:
        print(f"Error fixing CSV file: {str(e)}")
        
        # Try an alternative approach with pandas directly
        try:
            print("Trying alternative approach...")
            # Try reading with different separator detection
            df = pd.read_csv(input_path, sep=None, engine='python')
            
            # Clean up data
            for col in df.columns:
                if df[col].dtype == object:
                    df[col] = df[col].str.replace('\n', ' ')
                    df[col] = df[col].str.replace('\r', ' ')
                    df[col] = df[col].str.replace('"', "'")
            
            # Add ID column if not present
            if 'id' not in df.columns:
                df['id'] = [f"job-{i+1}" for i in range(len(df))]
                
            # Write cleaned data
            df.to_csv(output_path, index=False, quoting=csv.QUOTE_NONNUMERIC)
            
            print(f"Successfully fixed CSV file using alternative approach. Found {len(df)} rows.")
            return output_path
            
        except Exception as alt_e:
            print(f"Alternative approach also failed: {str(alt_e)}")
            return None

def main():
    """Main function to fix all CSV files in adzuna_data directory"""
    print("CSV File Fixer Tool")
    print("=================")
    
    data_dir = "adzuna_data"
    if not os.path.exists(data_dir):
        print(f"Error: Directory {data_dir} does not exist.")
        sys.exit(1)
    
    # Find all CSV files
    csv_files = [f for f in os.listdir(data_dir) if f.endswith('.csv')]
    
    if not csv_files:
        print(f"No CSV files found in {data_dir} directory.")
        sys.exit(1)
    
    print(f"Found {len(csv_files)} CSV files to fix.")
    
    # Create output directory for fixed files
    fixed_dir = os.path.join(data_dir, "fixed")
    os.makedirs(fixed_dir, exist_ok=True)
    
    fixed_files = []
    for file in csv_files:
        input_path = os.path.join(data_dir, file)
        output_path = os.path.join(fixed_dir, file)
        
        fixed_path = fix_csv_file(input_path, output_path)
        if fixed_path:
            fixed_files.append(fixed_path)
    
    print("\nSummary:")
    print(f"Processed {len(csv_files)} CSV files.")
    print(f"Successfully fixed {len(fixed_files)} files.")
    
    if fixed_files:
        print("\nNext steps:")
        print("1. Run the rebuild_vector_store.py script to rebuild the vector store with the fixed files")
        print("2. Restart the API server by running: ./restart_api.sh")

if __name__ == "__main__":
    main() 