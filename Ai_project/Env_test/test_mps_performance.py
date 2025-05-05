import torch
import time
import numpy as np
import matplotlib.pyplot as plt

def test_matrix_multiplication(sizes):
    mps_times = []
    cpu_times = []
    
    print("Testing matrix multiplication performance on MPS vs CPU")
    print("=" * 60)
    print(f"{'Size':>10} | {'MPS Time (s)':>12} | {'CPU Time (s)':>12} | {'Speedup':>10}")
    print("-" * 60)
    
    # Check if MPS is available
    if not torch.backends.mps.is_available():
        print("MPS is not available on this device.")
        return
    
    mps_device = torch.device("mps")
    cpu_device = torch.device("cpu")
    
    for size in sizes:
        # Generate random matrices
        a_cpu = torch.rand(size, size, device=cpu_device)
        b_cpu = torch.rand(size, size, device=cpu_device)
        
        # Copy to MPS
        a_mps = a_cpu.to(mps_device)
        b_mps = b_cpu.to(mps_device)
        
        # Warm up MPS
        _ = torch.matmul(a_mps, b_mps)
        torch.mps.synchronize()
        
        # Test MPS performance
        start_time = time.time()
        c_mps = torch.matmul(a_mps, b_mps)
        torch.mps.synchronize()  # Ensure computation is complete
        mps_time = time.time() - start_time
        mps_times.append(mps_time)
        
        # Test CPU performance
        start_time = time.time()
        c_cpu = torch.matmul(a_cpu, b_cpu)
        cpu_time = time.time() - start_time
        cpu_times.append(cpu_time)
        
        # Calculate speedup
        speedup = cpu_time / mps_time
        
        print(f"{size:10d} | {mps_time:12.6f} | {cpu_time:12.6f} | {speedup:10.2f}x")
    
    return mps_times, cpu_times, sizes

def plot_results(sizes, mps_times, cpu_times):
    plt.figure(figsize=(12, 6))
    
    # Plot times
    plt.subplot(1, 2, 1)
    plt.plot(sizes, mps_times, 'o-', label='MPS')
    plt.plot(sizes, cpu_times, 'o-', label='CPU')
    plt.xlabel('Matrix Size')
    plt.ylabel('Time (seconds)')
    plt.title('Matrix Multiplication Performance')
    plt.legend()
    plt.grid(True)
    
    # Plot speedup
    plt.subplot(1, 2, 2)
    speedups = [cpu/mps for cpu, mps in zip(cpu_times, mps_times)]
    plt.plot(sizes, speedups, 'o-', color='green')
    plt.axhline(y=1, color='r', linestyle='--')
    plt.xlabel('Matrix Size')
    plt.ylabel('Speedup (CPU time / MPS time)')
    plt.title('MPS Speedup over CPU')
    plt.grid(True)
    
    plt.tight_layout()
    plt.savefig('mps_performance.png')
    print("\nPerformance plot saved as 'mps_performance.png'")

def test_batch_processing():
    print("\nTesting batch processing performance on MPS vs CPU")
    print("=" * 60)
    
    if not torch.backends.mps.is_available():
        print("MPS is not available on this device.")
        return
    
    # Parameters
    batch_sizes = [32, 64, 128, 256, 512, 1024]
    feature_size = 1024
    
    mps_device = torch.device("mps")
    cpu_device = torch.device("cpu")
    
    mps_times = []
    cpu_times = []
    
    print(f"{'Batch Size':>12} | {'MPS Time (s)':>12} | {'CPU Time (s)':>12} | {'Speedup':>10}")
    print("-" * 60)
    
    for batch_size in batch_sizes:
        # Create sample batch and weights
        batch_cpu = torch.rand(batch_size, feature_size, device=cpu_device)
        weights_cpu = torch.rand(feature_size, feature_size, device=cpu_device)
        
        # Copy to MPS
        batch_mps = batch_cpu.to(mps_device)
        weights_mps = weights_cpu.to(mps_device)
        
        # Warm up MPS
        _ = torch.matmul(batch_mps, weights_mps)
        torch.mps.synchronize()
        
        # Test MPS performance
        start_time = time.time()
        output_mps = torch.matmul(batch_mps, weights_mps)
        torch.mps.synchronize()
        mps_time = time.time() - start_time
        mps_times.append(mps_time)
        
        # Test CPU performance
        start_time = time.time()
        output_cpu = torch.matmul(batch_cpu, weights_cpu)
        cpu_time = time.time() - start_time
        cpu_times.append(cpu_time)
        
        # Calculate speedup
        speedup = cpu_time / mps_time
        
        print(f"{batch_size:12d} | {mps_time:12.6f} | {cpu_time:12.6f} | {speedup:10.2f}x")
    
    return batch_sizes, mps_times, cpu_times

if __name__ == "__main__":
    # Test matrix multiplication with increasing sizes
    print("\n--- Testing Square Matrix Multiplication ---")
    matrix_sizes = [512, 1024, 2048, 4096, 6144, 8192]
    mps_times, cpu_times, sizes = test_matrix_multiplication(matrix_sizes)
    
    # Test batch processing
    print("\n--- Testing Batch Processing ---")
    batch_sizes, batch_mps_times, batch_cpu_times = test_batch_processing()
    
    # Plot results
    try:
        plot_results(sizes, mps_times, cpu_times)
    except ImportError:
        print("Matplotlib not available. Skipping plot generation.")
        
    print("\nTest complete. MPS acceleration is most effective for larger matrices.")
    print("For optimal performance on Apple Silicon:")
    print("1. Use larger batch sizes when possible")
    print("2. Prefer operations on large matrices (2048x2048 or larger)")
    print("3. Keep data on the same device to avoid transfer overhead") 