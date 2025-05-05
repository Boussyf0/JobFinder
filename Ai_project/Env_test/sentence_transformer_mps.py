import torch
import time
import psutil
import os
import numpy as np
from sentence_transformers import SentenceTransformer, util
import matplotlib.pyplot as plt

def memory_usage():
    """Get current memory usage in MB"""
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / (1024 * 1024)

def test_device_performance(model_name, devices, batch_sizes, sequence_length=64):
    """Test model performance across different devices and batch sizes"""
    results = {}
    
    print(f"Testing {model_name} on different devices with varying batch sizes")
    print("=" * 70)
    
    # Generate synthetic sentences of consistent length for fair comparison
    # Using a fixed sequence length to ensure consistent testing
    base_text = "This is a test sentence for benchmarking performance with MPS acceleration on Apple Silicon"
    words = base_text.split()
    text = " ".join(words[:sequence_length//8]) if sequence_length <= 512 else base_text  # ~8 chars per word
    
    for device_name in devices:
        results[device_name] = {"batch_sizes": batch_sizes, "times": [], "memory": []}
        
        print(f"\nLoading model on {device_name}...")
        start_mem = memory_usage()
        
        # Load model and move to appropriate device if needed
        if device_name == "mps" and torch.backends.mps.is_available():
            model = SentenceTransformer(model_name)
            # Set PyTorch to use MPS for various tensor operations
            # This doesn't move the model to MPS but helps with intermediate calculations
            torch.set_default_device('mps')
        else:
            model = SentenceTransformer(model_name)
            torch.set_default_device('cpu')
        
        end_mem = memory_usage()
        mem_usage = end_mem - start_mem
        
        print(f"Model loaded on {device_name}. Memory usage: {mem_usage:.2f} MB")
        
        for batch_size in batch_sizes:
            # Create a batch of sentences with consistent length
            sentences = [text] * batch_size
            
            # Warm up
            _ = model.encode(sentences[:min(batch_size, 8)])
            
            # Benchmark
            print(f"  Testing batch size {batch_size}...", end="", flush=True)
            start_time = time.time()
            _ = model.encode(sentences)
            end_time = time.time()
            
            encoding_time = end_time - start_time
            mem_used = memory_usage() - start_mem
            
            results[device_name]["times"].append(encoding_time)
            results[device_name]["memory"].append(mem_used)
            
            print(f" Done in {encoding_time:.4f}s, Memory: {mem_used:.2f} MB")
    
    return results

def plot_comparison(results, save_path="sbert_performance.png"):
    """Plot the performance comparison between devices"""
    device_names = list(results.keys())
    batch_sizes = results[device_names[0]]["batch_sizes"]
    
    # Plot setup
    plt.figure(figsize=(15, 10))
    
    # Batch size vs time plot
    plt.subplot(2, 1, 1)
    for device in device_names:
        plt.plot(batch_sizes, results[device]["times"], marker='o', label=device)
    
    plt.xlabel('Batch Size')
    plt.ylabel('Encoding Time (seconds)')
    plt.title('Encoding Time vs Batch Size by Device')
    plt.grid(True)
    plt.legend()
    
    # If we have two devices, calculate and plot speedup
    if len(device_names) == 2:
        speedups = [results[device_names[0]]["times"][i] / results[device_names[1]]["times"][i] 
                   for i in range(len(batch_sizes))]
        
        ax2 = plt.subplot(2, 1, 2)
        ax2.plot(batch_sizes, speedups, marker='s', color='green')
        ax2.set_xlabel('Batch Size')
        ax2.set_ylabel(f'Speedup ({device_names[0]} time / {device_names[1]} time)')
        ax2.set_title(f'{device_names[1]} Speedup Relative to {device_names[0]}')
        ax2.axhline(y=1, color='r', linestyle='--')
        ax2.grid(True)
    
    plt.tight_layout()
    plt.savefig(save_path)
    print(f"\nPerformance plot saved as '{save_path}'")

def demonstrate_similarity_search(model_name, corpus_size=1000, query_count=5):
    """Demonstrate a realistic use case: similarity search with MPS acceleration"""
    print("\n" + "=" * 70)
    print(f"Demonstrating similarity search with {model_name}")
    print("=" * 70)
    
    # Check if MPS is available
    use_mps = torch.backends.mps.is_available()
    device = 'mps' if use_mps else 'cpu'
    print(f"Using device: {device}")
    
    # Create corpus of sentences
    print(f"Generating corpus of {corpus_size} sentences...")
    corpus = [
        f"This is sentence {i} about topic {i % 10} with some additional text to make it longer" 
        for i in range(corpus_size)
    ]
    
    # Create queries
    queries = [
        f"Looking for information about topic {i}" 
        for i in range(query_count)
    ]
    
    # Load model
    print("Loading model...")
    model = SentenceTransformer(model_name)
    if use_mps:
        torch.set_default_device('mps')
    
    # Encode corpus
    print("Encoding corpus...")
    start_time = time.time()
    corpus_embeddings = model.encode(corpus, show_progress_bar=True)
    corpus_encoding_time = time.time() - start_time
    print(f"Corpus encoded in {corpus_encoding_time:.2f} seconds")
    
    # Encode queries
    print("Encoding queries...")
    start_time = time.time()
    query_embeddings = model.encode(queries)
    query_encoding_time = time.time() - start_time
    print(f"Queries encoded in {query_encoding_time:.2f} seconds")
    
    # Find top matches
    print("\nFinding top 3 matches for each query...")
    for i, query in enumerate(queries):
        print(f"\nQuery: {query}")
        
        start_time = time.time()
        # Calculate cosine similarity
        cos_scores = util.cos_sim(query_embeddings[i], corpus_embeddings)[0]
        
        # Get top k results
        top_k = 3
        top_results = torch.topk(cos_scores, k=top_k)
        search_time = time.time() - start_time
        
        print(f"Search completed in {search_time:.4f} seconds")
        print("\nTop matches:")
        
        for score, idx in zip(top_results[0], top_results[1]):
            print(f"Score: {score:.4f}, Text: {corpus[idx]}")

if __name__ == "__main__":
    # Settings
    model_name = "all-MiniLM-L6-v2"  # Small model for testing
    batch_sizes = [1, 4, 16, 32, 64, 128, 256]
    
    # Available devices to test
    devices = []
    if torch.backends.mps.is_available():
        devices.extend(["cpu", "mps"])
        print("MPS is available! Testing both CPU and MPS.")
    else:
        devices.append("cpu")
        print("MPS is not available. Testing CPU only.")
    
    # Test encoding performance
    results = test_device_performance(model_name, devices, batch_sizes)
    
    # Plot results
    try:
        plot_comparison(results)
    except Exception as e:
        print(f"Error plotting results: {e}")
    
    # Demonstrate real-world use case: similarity search
    demonstrate_similarity_search(model_name, corpus_size=500, query_count=3) 