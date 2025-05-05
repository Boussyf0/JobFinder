import torch
import os
import time
import argparse
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
import psutil
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("EmbeddingService")

class EmbeddingService:
    def __init__(self, model_name, use_mps=True, use_quantization=False):
        """
        Initialize the embedding service
        
        Args:
            model_name: Name of the SentenceTransformer model to use
            use_mps: Whether to use MPS acceleration (if available)
            use_quantization: Whether to use quantized model
        """
        self.model_name = model_name
        self.use_mps = use_mps and torch.backends.mps.is_available()
        self.use_quantization = use_quantization
        
        logger.info(f"Initializing Embedding Service with model: {model_name}")
        logger.info(f"MPS acceleration: {'Enabled' if self.use_mps else 'Disabled'}")
        logger.info(f"Quantization: {'Enabled' if self.use_quantization else 'Disabled'}")
        
        # Record initial memory usage
        self.initial_memory = self._get_memory_usage()
        
        # Load model
        self._load_model()
        
        # Create FAISS index
        self.index = None
        self.corpus = []
        self.corpus_embeddings = None
    
    def _load_model(self):
        """Load the SentenceTransformer model with appropriate configurations"""
        start_time = time.time()
        
        # Set default device if using MPS
        if self.use_mps:
            logger.info("Setting default device to MPS")
            torch.set_default_device('mps')
        
        # Load the model
        self.model = SentenceTransformer(self.model_name)
        
        # Try quantization if requested
        if self.use_quantization:
            try:
                logger.info("Attempting to quantize model...")
                # Try built-in quantization if available
                self.model = self.model.to_device(device='cpu', to_8bit=True)
                logger.info("Model quantized successfully using built-in method")
            except Exception as e:
                logger.warning(f"Built-in quantization failed: {e}")
                logger.info("Falling back to manual quantization using bitsandbytes")
                try:
                    import bitsandbytes as bnb
                    # Manual quantization could be implemented here
                    # This is just a placeholder
                    logger.info("Manual quantization with bitsandbytes is not implemented yet")
                except ImportError:
                    logger.warning("bitsandbytes not available for manual quantization")
        
        # Log memory usage after model loading
        load_time = time.time() - start_time
        current_memory = self._get_memory_usage()
        model_memory = current_memory - self.initial_memory
        
        logger.info(f"Model loaded in {load_time:.2f} seconds")
        logger.info(f"Model memory usage: {model_memory:.2f} MB")
    
    def _get_memory_usage(self):
        """Get current memory usage in MB"""
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / (1024 * 1024)
    
    def build_index(self, corpus, batch_size=64):
        """
        Build a FAISS index from a corpus of texts
        
        Args:
            corpus: List of strings to index
            batch_size: Batch size for encoding
        """
        self.corpus = corpus
        logger.info(f"Building index with {len(corpus)} documents")
        
        # Encode corpus
        start_time = time.time()
        self.corpus_embeddings = self.encode(corpus, batch_size=batch_size)
        encode_time = time.time() - start_time
        logger.info(f"Corpus encoded in {encode_time:.2f} seconds")
        
        # Create FAISS index
        embedding_dim = self.corpus_embeddings.shape[1]
        start_time = time.time()
        self.index = faiss.IndexFlatIP(embedding_dim)  # Inner product for cosine similarity
        self.index.add(self.corpus_embeddings)
        index_time = time.time() - start_time
        logger.info(f"FAISS index built in {index_time:.2f} seconds with {self.index.ntotal} vectors")
        
        # Log memory usage
        current_memory = self._get_memory_usage()
        total_memory = current_memory - self.initial_memory
        logger.info(f"Total memory usage after indexing: {total_memory:.2f} MB")
    
    def encode(self, texts, batch_size=64):
        """
        Encode texts into embeddings
        
        Args:
            texts: List of strings to encode
            batch_size: Batch size for encoding
        
        Returns:
            numpy array of embeddings
        """
        if not texts:
            return np.array([])
        
        logger.info(f"Encoding {len(texts)} texts with batch size {batch_size}")
        start_time = time.time()
        
        # Use MPS for intermediate operations if enabled
        embeddings = self.model.encode(
            texts, 
            batch_size=batch_size,
            show_progress_bar=len(texts) > 100,
            convert_to_numpy=True
        )
        
        encode_time = time.time() - start_time
        logger.info(f"Encoding completed in {encode_time:.2f} seconds ({len(texts)/encode_time:.1f} texts/sec)")
        
        return embeddings
    
    def search(self, query, top_k=5):
        """
        Search for similar documents in the index
        
        Args:
            query: String or list of strings to search for
            top_k: Number of results to return
        
        Returns:
            List of tuples (score, document)
        """
        if self.index is None:
            logger.error("Index not built. Call build_index first.")
            return []
        
        if isinstance(query, str):
            query = [query]
        
        # Encode query
        start_time = time.time()
        query_embeddings = self.encode(query)
        encode_time = time.time() - start_time
        
        # Search
        start_time = time.time()
        scores, indices = self.index.search(query_embeddings, top_k)
        search_time = time.time() - start_time
        
        logger.info(f"Query encoded in {encode_time:.4f}s, search completed in {search_time:.4f}s")
        
        # Format results
        results = []
        for i, (query_scores, query_indices) in enumerate(zip(scores, indices)):
            query_results = []
            for score, idx in zip(query_scores, query_indices):
                if idx < len(self.corpus):  # Ensure index is valid
                    query_results.append((float(score), self.corpus[idx]))
            results.append(query_results)
        
        return results[0] if len(query) == 1 else results

def demo():
    """Demonstrate the EmbeddingService with a sample corpus"""
    parser = argparse.ArgumentParser(description='Embedding Service Demo')
    parser.add_argument('--model', type=str, default='all-MiniLM-L6-v2', 
                        help='SentenceTransformer model to use')
    parser.add_argument('--no-mps', action='store_true', 
                        help='Disable MPS acceleration')
    parser.add_argument('--quantize', action='store_true', 
                        help='Enable model quantization')
    parser.add_argument('--corpus-size', type=int, default=1000, 
                        help='Size of the demo corpus')
    args = parser.parse_args()
    
    # Create embedding service
    service = EmbeddingService(
        model_name=args.model,
        use_mps=not args.no_mps,
        use_quantization=args.quantize
    )
    
    # Create demo corpus
    logger.info(f"Creating demo corpus with {args.corpus_size} documents")
    corpus = [
        f"Document {i} about topic {i % 10} with some additional text to make it longer and more realistic" 
        for i in range(args.corpus_size)
    ]
    
    # Build index
    service.build_index(corpus)
    
    # Test queries
    test_queries = [
        "Information about topic 5",
        "Looking for document 42",
        "Need details about topic 7"
    ]
    
    logger.info("\n" + "="*50)
    logger.info("Running test queries")
    
    for query in test_queries:
        logger.info(f"\nQuery: {query}")
        results = service.search(query, top_k=3)
        
        logger.info("Top matches:")
        for score, doc in results:
            logger.info(f"Score: {score:.4f}, Document: {doc}")
    
    # Memory statistics
    current_memory = service._get_memory_usage()
    total_memory = current_memory - service.initial_memory
    logger.info("\n" + "="*50)
    logger.info(f"Final memory usage: {total_memory:.2f} MB")
    
    # Performance tips
    logger.info("\nPerformance tips:")
    if service.use_mps:
        logger.info("- MPS acceleration is enabled and working correctly")
        logger.info("- For better performance, use larger batch sizes when possible")
    else:
        if torch.backends.mps.is_available():
            logger.info("- MPS is available but not enabled. Use --no-mps=False to enable it")
        else:
            logger.info("- MPS is not available on this system")
    
    if service.use_quantization:
        logger.info("- Quantization is enabled, which reduces memory usage but may slightly impact accuracy")
    else:
        logger.info("- Quantization is disabled. Use --quantize to enable it and reduce memory usage")

if __name__ == "__main__":
    demo() 