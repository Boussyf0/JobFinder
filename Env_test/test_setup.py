import torch
import psutil
import os
from sentence_transformers import SentenceTransformer
import time
from transformers import AutoModel, AutoTokenizer, BitsAndBytesConfig
from transformers import AutoModelForSequenceClassification
import bitsandbytes as bnb

def print_system_info():
    print("PyTorch version:", torch.__version__)
    print("MPS available:", torch.backends.mps.is_available())
    
    # Memory information
    memory = psutil.virtual_memory()
    print(f"Total memory: {memory.total / (1024**3):.2f} GB")
    print(f"Available memory: {memory.available / (1024**3):.2f} GB")
    print(f"Used memory: {memory.used / (1024**3):.2f} GB")
    print(f"Memory percent: {memory.percent}%")




def test_mps():
    if torch.backends.mps.is_available():
        device = torch.device("mps")
        print("Using MPS device for computation")
        
        # Larger tensors
        x = torch.rand(5000, 5000, device=device)
        y = torch.rand(5000, 5000, device=device)
        
        start_time = time.time()
        z = torch.matmul(x, y)
        torch.mps.synchronize()
        mps_time = time.time() - start_time
        print(f"MPS computation time: {mps_time:.5f} seconds")
        
        x_cpu = x.to("cpu")
        y_cpu = y.to("cpu")
        
        start_time = time.time()
        z_cpu = torch.matmul(x_cpu, y_cpu)
        cpu_time = time.time() - start_time
        print(f"CPU computation time: {cpu_time:.5f} seconds")
        
        print(f"Speed improvement with MPS: {cpu_time/mps_time:.2f}x")
    else:
        print("MPS not available")


def test_quantized_model():
    print("\nTesting sentence-transformers model...")
    process = psutil.Process(os.getpid())
    
    model_name = 'all-MiniLM-L6-v2'
    
    # Load model and calculate memory
    start_time = time.time()
    model = SentenceTransformer(model_name)
    load_time = time.time() - start_time
    print(f"Model loading time: {load_time:.2f} seconds")
    
    # Calculate model memory
    param_size = sum(p.nelement() * p.element_size() for p in model.parameters())
    buffer_size = sum(b.nelement() * b.element_size() for b in model.buffers())
    model_memory_mb = (param_size + buffer_size) / (1024 * 1024)
    print(f"Model parameters+buffers memory: {model_memory_mb:.2f} MB")
    
    # Test encoding
    sentences = [
        "This is an example sentence",
        "Each sentence is converted to a vector",
        "Sentence transformers are useful for various NLP tasks"
    ]
    
    start_time = time.time()
    embeddings = model.encode(sentences)
    cpu_encode_time = time.time() - start_time
    print(f"CPU encoding time: {cpu_encode_time:.4f} seconds")
    
    # Quantization using Hugging Face's transformers
    try:
        print("\nTrying 8-bit quantization with Hugging Face and bitsandbytes...")
        # Use Hugging Face's BitsAndBytesConfig
        quantization_config = BitsAndBytesConfig(load_in_8bit=True)
        
        # Load the base model (not SentenceTransformer)
        hf_model = AutoModel.from_pretrained(
            model_name,
            quantization_config=quantization_config,
            device_map="cpu"  # Use "mps" if supported, but test CPU first
        )
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        
        # Tokenize and encode
        inputs = tokenizer(sentences, return_tensors="pt", padding=True)
        start_time = time.time()
        with torch.no_grad():
            outputs = hf_model(**inputs)
        quant_encode_time = time.time() - start_time
        print(f"Quantized encoding time: {quant_encode_time:.4f} seconds")
        print(f"Output shape: {outputs.last_hidden_state.shape}")
    except Exception as e:
        print(f"Quantization failed: {e}")

def test_quantized_model():
    print("\nTesting sentence-transformers model...")
    process = psutil.Process(os.getpid())
    
    model_name = 'all-MiniLM-L6-v2'
    
    # Load model and calculate memory
    start_time = time.time()
    model = SentenceTransformer(model_name)
    load_time = time.time() - start_time
    print(f"Model loading time: {load_time:.2f} seconds")
    
    # Calculate model memory
    param_size = sum(p.nelement() * p.element_size() for p in model.parameters())
    buffer_size = sum(b.nelement() * b.element_size() for b in model.buffers())
    model_memory_mb = (param_size + buffer_size) / (1024 * 1024)
    print(f"Model parameters+buffers memory: {model_memory_mb:.2f} MB")
    
    # Test encoding
    sentences = [
        "This is an example sentence",
        "Each sentence is converted to a vector",
        "Sentence transformers are useful for various NLP tasks"
    ]
    
    start_time = time.time()
    embeddings = model.encode(sentences)
    cpu_encode_time = time.time() - start_time
    print(f"CPU encoding time: {cpu_encode_time:.4f} seconds")
    
    # Try quantization with bitsandbytes
    try:
        print("\nTrying 8-bit quantization with bitsandbytes...")
        quant_model = AutoModelForSequenceClassification.from_pretrained(
            model_name,
            quantization_config=bnb.quantization.QuantizationConfig(load_in_8bit=True),
            device_map="cpu"
        )
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        
        inputs = tokenizer(sentences, return_tensors="pt", padding=True)
        start_time = time.time()
        with torch.no_grad():
            outputs = quant_model(**inputs)
        quant_encode_time = time.time() - start_time
        print(f"Quantized encoding time: {quant_encode_time:.4f} seconds")
    except Exception as e:
        print(f"Quantization failed: {e}")


if __name__ == "__main__":
    print("=== System Information ===")
    print_system_info()
    
    print("\n=== Testing MPS Performance ===")
    test_mps()
    
    print("\n=== Testing Sentence Transformers ===")
    test_quantized_model()