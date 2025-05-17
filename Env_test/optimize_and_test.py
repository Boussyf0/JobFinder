import os
import torch
from transformers import AutoTokenizer, AutoModel
from optimum.exporters.onnx import main_export
from onnxruntime.quantization import quantize_dynamic, QuantType
import onnxruntime as ort
import time
import onnx

# Settings
model_id = "sentence-transformers/all-MiniLM-L6-v2"
output_dir = "onnx_output"
os.makedirs(output_dir, exist_ok=True)

onnx_path = os.path.join(output_dir, "model.onnx")
quantized_path = os.path.join(output_dir, "quantized_model.onnx")

# Step 1: Export to ONNX
def export_to_onnx():
    print("🔄 Exporting model to ONNX format...")
    try:
        # Export the model to ONNX format
        main_export(
            model_name_or_path=model_id,
            output=output_dir,
            task="feature-extraction",
            opset=14,  # Use opset 14 for better operator support
            device="cpu"
        )
        
        # Validate the exported ONNX model
        validate_onnx_model(onnx_path)
        print("✅ Export complete.")
    except Exception as e:
        print(f"❌ Export failed: {str(e)}")

# Step 2: Validate the ONNX Model
def validate_onnx_model(onnx_file):
    print("🔍 Validating ONNX model...")
    try:
        model = onnx.load(onnx_file)
        onnx.checker.check_model(model)
        print("✅ ONNX model validation successful!")
    except Exception as e:
        print(f"❌ ONNX validation failed: {str(e)}")

# Step 3: Quantize the ONNX Model
def quantize_model():
    print("⚙️ Quantizing model...")
    try:
        quantize_dynamic(
            model_input=onnx_path,
            model_output=quantized_path,
            weight_type=QuantType.QInt8  # Use 8-bit quantization
        )
        print("✅ Quantization complete.")
    except Exception as e:
        print(f"❌ Quantization failed: {str(e)}")

# Step 4: Run Inference Using ONNX
def run_inference():
    print("🚀 Running inference on quantized model...")
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    sentences = [
        "This is an example sentence",
        "Each sentence is converted to a vector",
        "Sentence transformers are useful for various NLP tasks"
    ]
    
    # Tokenize input sentences
    encoded_input = tokenizer(sentences, return_tensors="np", padding=True, truncation=True)

    try:
        # Load the quantized model
        session = ort.InferenceSession(quantized_path)
        input_names = [input.name for input in session.get_inputs()]

        # Run inference
        start = time.time()
        outputs = session.run(None, {
            input_names[0]: encoded_input["input_ids"],
            input_names[1]: encoded_input["attention_mask"]
        })
        duration = time.time() - start

        print(f"✅ Inference complete in {duration:.4f} seconds")
        print(f"🧠 Embedding shape: {outputs[0].shape}")
    except Exception as e:
        print(f"❌ Inference failed: {str(e)}")

if __name__ == "__main__":
    export_to_onnx()
    validate_onnx_model(onnx_path)  # Optional but recommended
    quantize_model()
    run_inference()