import os
import numpy as np
import torch
from transformers import AutoTokenizer, AutoModel
from optimum.exporters.onnx import main_export
from onnxruntime.quantization import quantize_dynamic, QuantType
import onnxruntime as ort
import time
import psutil
import matplotlib.pyplot as plt

# Settings
model_id = "sentence-transformers/all-MiniLM-L6-v2"  # Replace with your desired SBERT model
output_dir = "onnx_output"
os.makedirs(output_dir, exist_ok=True)

onnx_path = os.path.join(output_dir, "model.onnx")
quantized_path = os.path.join(output_dir, "quantized_model.onnx")

# Sentences for testing
sentences = [
    "This is an example sentence",
    "Each sentence is converted to a vector",
    "Sentence transformers are useful for various NLP tasks"
]

# Step 1: Export SBERT Model to ONNX Format
def export_to_onnx():
    print("🔄 Exporting SBERT model to ONNX format...")
    try:
        main_export(
            model_name_or_path=model_id,
            output=output_dir,
            task="feature-extraction",  # Task for SBERT models
            opset=14,  # Use ONNX opset 14 for better operator support
            device="cpu"
        )
        print(f"✅ Exported ONNX model to {onnx_path}")
    except Exception as e:
        print(f"❌ Export failed: {str(e)}")

# Step 2: Quantize the ONNX Model to 8-bit
def quantize_model():
    print("⚙️ Quantizing ONNX model to 8-bit...")
    try:
        quantize_dynamic(
            model_input=onnx_path,
            model_output=quantized_path,
            weight_type=QuantType.QInt8  # Use 8-bit integer weights
        )
        print(f"✅ Quantized model saved to {quantized_path}")
    except Exception as e:
        print(f"❌ Quantization failed: {str(e)}")

# Step 3: Run Inference Using the Quantized Model
def run_inference(session, name):
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    encoded_input = tokenizer(sentences, return_tensors="np", padding=True, truncation=True)
    
    input_names = [input.name for input in session.get_inputs()]
    
    print(f"🚀 Running inference on {name} model...")
    start = time.time()
    outputs = session.run(None, {
        input_names[0]: encoded_input["input_ids"],
        input_names[1]: encoded_input["attention_mask"]
    })
    duration = time.time() - start
    
    print(f"✅ Inference complete in {duration:.4f} seconds")
    print(f"🧠 Embedding shape: {outputs[0].shape}")
    return duration

# Step 4: Benchmark Memory Usage and Speed
def benchmark_memory_usage():
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()
    memory_mb = memory_info.rss / (1024 * 1024)  # Convert bytes to MB
    print(f"📊 Current memory usage: {memory_mb:.2f} MB")
    return memory_mb

# Step 5: Visualize Results
def visualize_results(onnx_time, quantized_time, onnx_memory, quantized_memory):
    labels = ["ONNX Model", "Quantized ONNX Model"]
    times = [onnx_time, quantized_time]
    memory = [onnx_memory, quantized_memory]

    fig, ax1 = plt.subplots()

    # Plot inference time
    color = 'tab:blue'
    ax1.set_xlabel('Model Type')
    ax1.set_ylabel('Inference Time (seconds)', color=color)
    ax1.bar(labels, times, color=color, alpha=0.6, label="Inference Time")
    ax1.tick_params(axis='y', labelcolor=color)

    # Plot memory usage
    ax2 = ax1.twinx()
    color = 'tab:red'
    ax2.set_ylabel('Memory Usage (MB)', color=color)
    ax2.plot(labels, memory, color=color, marker='o', label="Memory Usage")
    ax2.tick_params(axis='y', labelcolor=color)

    fig.tight_layout()
    plt.title("Comparison of ONNX and Quantized ONNX Models")
    plt.show()

# Main Execution
if __name__ == "__main__":
    # Export the model to ONNX
    export_to_onnx()
    
    # Quantize the ONNX model
    quantize_model()
    
    # Load ONNX Runtime sessions
    onnx_session = ort.InferenceSession(onnx_path)
    quantized_session = ort.InferenceSession(quantized_path)
    
    # Benchmark memory usage before inference
    initial_memory = benchmark_memory_usage()
    
    # Run inference and measure time/memory
    onnx_time = run_inference(onnx_session, "ONNX")
    onnx_memory = benchmark_memory_usage()
    
    quantized_time = run_inference(quantized_session, "Quantized ONNX")
    quantized_memory = benchmark_memory_usage()
    
    # Visualize results
    visualize_results(onnx_time, quantized_time, onnx_memory, quantized_memory)