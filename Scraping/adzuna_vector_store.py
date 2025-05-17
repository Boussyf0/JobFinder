import faiss
import numpy as np
import pickle
import os
import json
from typing import Dict, List, Union, Tuple, Any
from sentence_transformers import SentenceTransformer
import pandas as pd
from tqdm import tqdm

class JobVectorStore:
    """
    A vector database for job listings using FAISS (Facebook AI Similarity Search).
    This enables efficient similarity search and advanced querying of job data.
    """
    
    def __init__(self, 
                 model_name: str = "paraphrase-multilingual-MiniLM-L12-v2", 
                 data_dir: str = "adzuna_data",
                 vector_dir: str = "vector_store"):
        """
        Initialize JobVectorStore.
        
        Args:
            model_name: Name of the sentence-transformer model for generating embeddings
            data_dir: Directory where CSV job data is stored
            vector_dir: Directory to store vector indices and metadata
        """
        self.data_dir = data_dir
        self.vector_dir = vector_dir
        
        # Create vector store directory if it doesn't exist
        if not os.path.exists(vector_dir):
            os.makedirs(vector_dir)
            
        # Load embedding model
        print(f"Loading embedding model: {model_name}")
        self.model = SentenceTransformer(model_name)
        self.vector_dim = self.model.get_sentence_embedding_dimension()
        print(f"Model loaded with vector dimension: {self.vector_dim}")
        
        # Initialize FAISS index
        self.index = faiss.IndexFlatL2(self.vector_dim)  # L2 distance (Euclidean)
        
        # Storage for job data
        self.jobs = []
        self.job_ids_map = {}  # Maps FAISS index positions to job indices in self.jobs
        
    def _create_job_vector(self, job: Dict[str, Any]) -> np.ndarray:
        """
        Create a vector embedding for a job listing.
        
        Args:
            job: Job listing dictionary
            
        Returns:
            Vector embedding as numpy array
        """
        # Create a rich text representation combining important job fields
        text = f"Title: {job.get('title', '')} "
        text += f"Company: {job.get('company', '')} "
        text += f"Location: {job.get('location', '')} "
        text += f"Description: {job.get('description', '')}"
        
        # Generate embedding
        return self.model.encode([text])[0]
    
    def add_jobs_from_csv(self, csv_path: str) -> int:
        """
        Add jobs from a CSV file to the vector store.
        
        Args:
            csv_path: Path to CSV file containing job data
            
        Returns:
            Number of jobs added
        """
        print(f"Loading jobs from {csv_path}")
        
        try:
            jobs_df = pd.read_csv(csv_path)
            print(f"Found {len(jobs_df)} jobs in CSV")
            
            return self.add_jobs_from_dataframe(jobs_df)
            
        except Exception as e:
            print(f"Error loading CSV: {str(e)}")
            return 0
    
    def add_jobs_from_dataframe(self, jobs_df: pd.DataFrame) -> int:
        """
        Add jobs from a pandas DataFrame to the vector store.
        
        Args:
            jobs_df: DataFrame containing job data
            
        Returns:
            Number of jobs added
        """
        # Get current index size
        current_index = len(self.jobs)
        added = 0
        
        # Convert DataFrame to list of dicts
        jobs_to_add = jobs_df.to_dict('records')
        
        # Create vectors for each job
        vectors = []
        valid_jobs = []
        
        print("Creating embeddings for jobs...")
        for job in tqdm(jobs_to_add):
            try:
                vector = self._create_job_vector(job)
                vectors.append(vector)
                valid_jobs.append(job)
                
                # Map the FAISS index position to the job index in self.jobs
                self.job_ids_map[current_index + added] = current_index + added
                
                added += 1
            except Exception as e:
                print(f"Error creating embedding for job: {str(e)}")
        
        if added > 0:
            # Convert to numpy array and add to FAISS index
            job_vectors = np.array(vectors).astype('float32')
            self.index.add(job_vectors)
            
            # Store job data
            self.jobs.extend(valid_jobs)
            
            print(f"Added {added} jobs to vector store")
        else:
            print("No jobs were added")
            
        return added
    
    def search_similar_jobs(self, 
                           query: str, 
                           k: int = 10, 
                           filter_fn: callable = None) -> List[Dict[str, Any]]:
        """
        Search for jobs similar to the query text.
        
        Args:
            query: Search query text
            k: Number of results to return
            filter_fn: Optional function to filter results
            
        Returns:
            List of similar jobs with similarity scores
        """
        if not self.jobs:
            print("Vector store is empty")
            return []
        
        try:
            # Create query vector
            query_vector = self.model.encode([query])[0].reshape(1, -1).astype('float32')
            
            # Search in FAISS
            distances, indices = self.index.search(query_vector, k if not filter_fn else min(k*5, len(self.jobs)))
            
            # Get job data for results
            results = []
            for i, (dist, idx) in enumerate(zip(distances[0], indices[0])):
                # Skip invalid indices (can happen if index was modified)
                if idx < 0 or idx >= len(self.jobs):
                    continue
                    
                # Get the job using the mapping
                job_id = self.job_ids_map.get(idx)
                if job_id is None or job_id >= len(self.jobs):
                    continue
                    
                job = self.jobs[job_id].copy()
                
                # Add distance score (convert to similarity score)
                job['similarity_score'] = 1.0 / (1.0 + dist)
                
                # Apply filter if provided
                if filter_fn and not filter_fn(job):
                    continue
                    
                results.append(job)
                
                # Stop if we have enough results after filtering
                if len(results) >= k:
                    break
            
            # If we got results, return them
            if results:
                return results
            
            # Fallback if no results from vector search
            print("No results from vector search, using fallback")
            return self._fallback_search(query, k, filter_fn)
                    
        except Exception as e:
            print(f"Error in vector search: {str(e)}")
            # Fallback to simple text search
            return self._fallback_search(query, k, filter_fn)
            
    def _fallback_search(self, query: str, k: int, filter_fn: callable = None) -> List[Dict[str, Any]]:
        """
        Fallback search method when vector search fails.
        Uses simple text matching.
        
        Args:
            query: Search query text
            k: Number of results to return
            filter_fn: Optional function to filter results
            
        Returns:
            List of jobs matching the query
        """
        print(f"Using fallback search for query: {query}")
        query_terms = query.lower().split()
        
        # Score jobs based on term matches
        scored_jobs = []
        for idx, job in enumerate(self.jobs):
            if filter_fn and not filter_fn(job):
                continue
                
            job_text = f"{job.get('title', '')} {job.get('company', '')} {job.get('description', '')}".lower()
            
            # Count matches
            match_score = sum(term in job_text for term in query_terms)
            if match_score > 0 or not query_terms:  # Include if matches or query is empty
                job_copy = job.copy()
                job_copy['similarity_score'] = match_score / max(1, len(query_terms))
                scored_jobs.append(job_copy)
        
        # Sort by score and take top k
        scored_jobs.sort(key=lambda j: j['similarity_score'], reverse=True)
        
        # If still no results, just return random jobs
        if not scored_jobs:
            print("No matches in fallback search, returning random jobs")
            import random
            random_jobs = random.sample(self.jobs, min(k, len(self.jobs)))
            for job in random_jobs:
                job_copy = job.copy()
                job_copy['similarity_score'] = 0.1  # Low score for random results
                scored_jobs.append(job_copy)
                
        return scored_jobs[:k]
    
    def search_by_keywords(self, 
                          keywords: List[str], 
                          k: int = 10, 
                          require_all: bool = False) -> List[Dict[str, Any]]:
        """
        Search for jobs containing specific keywords.
        
        Args:
            keywords: List of keywords to search for
            k: Number of results to return
            require_all: If True, all keywords must be present
            
        Returns:
            List of matching jobs with scores
        """
        # Create a filter function for the keywords
        def keyword_filter(job):
            text = f"{job.get('title', '')} {job.get('description', '')}".lower()
            
            if require_all:
                return all(kw.lower() in text for kw in keywords)
            else:
                return any(kw.lower() in text for kw in keywords)
        
        # Use the query as the combination of all keywords
        query = " ".join(keywords)
        
        return self.search_similar_jobs(query, k, keyword_filter)
    
    def search_by_job_title(self, title: str, k: int = 10) -> List[Dict[str, Any]]:
        """
        Search for jobs with similar titles.
        
        Args:
            title: Job title to search for
            k: Number of results to return
            
        Returns:
            List of jobs with similar titles
        """
        return self.search_similar_jobs(f"Title: {title}", k)
    
    def search_remote_jobs(self, query: str, k: int = 10) -> List[Dict[str, Any]]:
        """
        Search for remote jobs matching the query.
        
        Args:
            query: Search query
            k: Number of results to return
            
        Returns:
            List of matching remote jobs
        """
        def remote_filter(job):
            return job.get('remote_friendly', False) or 'remote' in str(job.get('location', '')).lower()
            
        return self.search_similar_jobs(query, k, remote_filter)
    
    def search_morocco_relevant(self, query: str, k: int = 10) -> List[Dict[str, Any]]:
        """
        Search for jobs relevant to Morocco matching the query.
        
        Args:
            query: Search query
            k: Number of results to return
            
        Returns:
            List of matching Morocco-relevant jobs
        """
        def morocco_filter(job):
            # Job is considered Morocco-relevant if it's remote, international,
            # or has Morocco/Maroc in the text
            text = f"{job.get('title', '')} {job.get('location', '')} {job.get('description', '')}".lower()
            
            is_remote = job.get('remote_friendly', False) or 'remote' in text
            is_international = job.get('international', False)
            mentions_morocco = any(term in text for term in ['morocco', 'maroc', 'rabat', 'casablanca', 'tanger', 'fes'])
            
            return is_remote or is_international or mentions_morocco
            
        return self.search_similar_jobs(query, k, morocco_filter)
    
    def add_jobs_from_directory(self, directory: str = None) -> int:
        """
        Add jobs from all CSV files in a directory.
        
        Args:
            directory: Directory containing CSV files (defaults to data_dir)
            
        Returns:
            Total number of jobs added
        """
        if directory is None:
            directory = self.data_dir
            
        if not os.path.exists(directory):
            print(f"Directory not found: {directory}")
            return 0
            
        total_added = 0
        
        for filename in os.listdir(directory):
            if filename.endswith('.csv'):
                filepath = os.path.join(directory, filename)
                added = self.add_jobs_from_csv(filepath)
                total_added += added
                
        print(f"Added a total of {total_added} jobs from {directory}")
        return total_added
    
    def get_job_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about the jobs in the vector store.
        
        Returns:
            Dictionary with statistics
        """
        if not self.jobs:
            return {"total_jobs": 0}
            
        specialties = {}
        countries = {}
        remote_count = 0
        international_count = 0
        
        for job in self.jobs:
            # Count by specialty
            specialty = job.get('specialty', 'unknown')
            if specialty:
                specialties[specialty] = specialties.get(specialty, 0) + 1
                
            # Count by country
            country = job.get('source_country', 'unknown')
            if country:
                countries[country] = countries.get(country, 0) + 1
                
            # Count remote jobs
            if job.get('remote_friendly', False):
                remote_count += 1
                
            # Count international jobs
            if job.get('international', False):
                international_count += 1
                
        return {
            "total_jobs": len(self.jobs),
            "specialties": specialties,
            "countries": countries,
            "remote_jobs": remote_count,
            "international_jobs": international_count
        }
    
    def save(self, base_filename: str = "job_vector_store") -> bool:
        """
        Save the vector store to disk.
        
        Args:
            base_filename: Base filename for saved files
            
        Returns:
            True if successful
        """
        try:
            # Save FAISS index
            index_path = os.path.join(self.vector_dir, f"{base_filename}.index")
            faiss.write_index(self.index, index_path)
            
            # Save job data and mapping
            data_path = os.path.join(self.vector_dir, f"{base_filename}.pkl")
            with open(data_path, 'wb') as f:
                pickle.dump((self.jobs, self.job_ids_map), f)
                
            print(f"Vector store saved to {self.vector_dir}/{base_filename}.*")
            return True
            
        except Exception as e:
            print(f"Error saving vector store: {str(e)}")
            return False
    
    def load(self, base_filename: str = "job_vector_store") -> bool:
        """
        Load the vector store from disk.
        
        Args:
            base_filename: Base filename for saved files
            
        Returns:
            True if successful
        """
        try:
            # Check if files exist
            index_path = os.path.join(self.vector_dir, f"{base_filename}.index")
            data_path = os.path.join(self.vector_dir, f"{base_filename}.pkl")
            
            if not os.path.exists(index_path) or not os.path.exists(data_path):
                print(f"Vector store files not found at {self.vector_dir}/{base_filename}.*")
                return False
                
            # Load FAISS index
            self.index = faiss.read_index(index_path)
            
            # Load job data and mapping
            with open(data_path, 'rb') as f:
                self.jobs, self.job_ids_map = pickle.load(f)
                
            print(f"Loaded vector store with {len(self.jobs)} jobs")
            return True
            
        except Exception as e:
            print(f"Error loading vector store: {str(e)}")
            return False

# Example usage
if __name__ == "__main__":
    # Initialize vector store
    vector_store = JobVectorStore()
    
    # Try to load existing store or create new one
    if not vector_store.load():
        print("Creating new vector store")
        
        # Add jobs from CSV files in adzuna_data directory
        vector_store.add_jobs_from_directory()
        
        # Save the vector store
        vector_store.save()
    
    # Print statistics
    stats = vector_store.get_job_statistics()
    print("\nJob Statistics:")
    print(f"Total jobs: {stats['total_jobs']}")
    print(f"Remote jobs: {stats['remote_jobs']}")
    print(f"International jobs: {stats['international_jobs']}")
    
    if stats['total_jobs'] > 0:
        # Example searches
        print("\nExample search for 'software developer':")
        results = vector_store.search_similar_jobs("software developer", k=5)
        for i, job in enumerate(results, 1):
            print(f"{i}. {job.get('title')} at {job.get('company')} - Score: {job.get('similarity_score'):.2f}")
        
        print("\nExample search for remote jobs:")
        results = vector_store.search_remote_jobs("data scientist", k=5)
        for i, job in enumerate(results, 1):
            print(f"{i}. {job.get('title')} at {job.get('company')} - Score: {job.get('similarity_score'):.2f}") 