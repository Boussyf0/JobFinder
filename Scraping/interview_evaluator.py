"""
Interview Evaluator Module

This module provides speech-to-text functionality using OpenAI's Whisper model
and response evaluation using LLaMA 2 for qualitative assessment of interview answers.
"""

import os
import base64
import json
import tempfile
import numpy as np
from typing import Dict, List, Any, Tuple, Optional
import torch
from transformers import pipeline, AutoModelForCausalLM, AutoTokenizer
import whisper

# Initialize models
whisper_model = None
llama_model = None
llama_tokenizer = None

def init_models(whisper_model_size="base", llama_model_path="meta-llama/Llama-2-7b-chat-hf"):
    """
    Initialize the Whisper and LLaMA models.
    
    Args:
        whisper_model_size: Size of the Whisper model ('tiny', 'base', 'small', 'medium', 'large')
        llama_model_path: Path or HuggingFace model ID for the LLaMA model
    """
    global whisper_model, llama_model, llama_tokenizer
    
    print(f"Initializing Whisper model ({whisper_model_size})...")
    whisper_model = whisper.load_model(whisper_model_size)
    
    print(f"Initializing LLaMA model from {llama_model_path}...")
    try:
        llama_tokenizer = AutoTokenizer.from_pretrained(llama_model_path)
        llama_model = AutoModelForCausalLM.from_pretrained(
            llama_model_path,
            torch_dtype=torch.float16,
            device_map="auto",
            load_in_8bit=True  # Use 8-bit quantization to reduce memory usage
        )
        print("LLaMA model initialized successfully")
    except Exception as e:
        print(f"Failed to load LLaMA model: {str(e)}")
        print("Falling back to a smaller open source model...")
        try:
            # Fall back to a smaller model if LLaMA is not available
            fallback_model = "facebook/opt-1.3b"
            llama_tokenizer = AutoTokenizer.from_pretrained(fallback_model)
            llama_model = AutoModelForCausalLM.from_pretrained(
                fallback_model, 
                torch_dtype=torch.float16,
                device_map="auto",
                load_in_8bit=True
            )
            print(f"Fallback model {fallback_model} initialized successfully")
        except Exception as fallback_error:
            print(f"Failed to load fallback model: {str(fallback_error)}")

def transcribe_audio(audio_base64: str) -> str:
    """
    Transcribe audio using OpenAI's Whisper model.
    
    Args:
        audio_base64: Base64 encoded audio data
        
    Returns:
        Transcribed text
    """
    global whisper_model
    
    if whisper_model is None:
        init_models()
    
    try:
        # Decode base64 audio
        audio_bytes = base64.b64decode(audio_base64)
        
        # Save audio to a temporary file
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name
        
        # Transcribe the audio
        result = whisper_model.transcribe(temp_path)
        
        # Clean up the temporary file
        os.unlink(temp_path)
        
        return result["text"]
    
    except Exception as e:
        print(f"Error transcribing audio: {str(e)}")
        return ""

def evaluate_answer(question: str, answer: str, job_description: str, skills: List[str]) -> Dict[str, Any]:
    """
    Evaluate an interview answer using LLaMA 2.
    
    Args:
        question: The interview question
        answer: The candidate's answer
        job_description: Description of the job
        skills: List of required skills for the job
        
    Returns:
        Dictionary containing evaluation metrics and feedback
    """
    global llama_model, llama_tokenizer
    
    if llama_model is None or llama_tokenizer is None:
        init_models()
    
    # Create context with job information and evaluation criteria
    skills_str = ", ".join(skills[:5]) if skills else "relevant skills"
    
    # Create prompt for the model
    prompt = f"""<s>[INST] You are an expert interview coach evaluating a candidate's response for a job. 
Please provide an objective assessment based on this context:

JOB CONTEXT:
- Key skills required: {skills_str}
- Job description summary: {job_description[:300]}...

INTERVIEW QUESTION:
{question}

CANDIDATE'S ANSWER:
{answer}

Evaluate the answer based on:
1. Relevance to the question (0-10)
2. Depth of knowledge demonstrated (0-10)
3. Structure and clarity (0-10)
4. Use of specific examples (0-10)
5. Overall impression (0-10)

Please provide:
- A score for each category
- A short analysis of strengths (2-3 points)
- A short analysis of areas for improvement (2-3 points)
- An overall rating out of 10
- A one-sentence suggestion to improve

Format your response in JSON:
```json
{{
  "scores": {{
    "relevance": <score>,
    "knowledge": <score>,
    "clarity": <score>,
    "examples": <score>,
    "overall": <score>
  }},
  "analysis": {{
    "strengths": ["<point1>", "<point2>"],
    "improvements": ["<point1>", "<point2>"]
  }},
  "rating": <overall_rating>,
  "suggestion": "<improvement_suggestion>"
}}
```
[/INST]"""

    try:
        # Generate evaluation using LLaMA 2
        inputs = llama_tokenizer(prompt, return_tensors="pt").to(llama_model.device)
        
        # Generate with appropriate parameters
        with torch.no_grad():
            outputs = llama_model.generate(
                **inputs,
                max_new_tokens=800,
                temperature=0.7,
                top_p=0.9,
                repetition_penalty=1.1
            )
            
        response = llama_tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Extract JSON from the response
        json_match = response.split("```json")
        if len(json_match) > 1:
            json_text = json_match[1].split("```")[0].strip()
            try:
                result = json.loads(json_text)
                return result
            except json.JSONDecodeError:
                print("Failed to parse JSON from LLaMA output")
        
        # Fallback to a simpler structured response if JSON parsing fails
        return {
            "scores": {
                "relevance": 7,
                "knowledge": 6,
                "clarity": 7,
                "examples": 5,
                "overall": 6
            },
            "analysis": {
                "strengths": ["Shows basic understanding", "Clear communication"],
                "improvements": ["Could provide more specific examples", "Expand on technical details"]
            },
            "rating": 6.5,
            "suggestion": "Include more concrete examples from your experience to strengthen your answer."
        }
    
    except Exception as e:
        print(f"Error evaluating answer: {str(e)}")
        # Return a default evaluation in case of errors
        return {
            "scores": {
                "relevance": 5,
                "knowledge": 5,
                "clarity": 5,
                "examples": 5,
                "overall": 5
            },
            "analysis": {
                "strengths": ["Unable to fully analyze response"],
                "improvements": ["Please try again with more details"]
            },
            "rating": 5.0,
            "suggestion": "Provide a more detailed response for better evaluation."
        }

def create_job_context_vector(job_description: str, skills: List[str]) -> Dict[str, Any]:
    """
    Create a context vector for a job based on its description and required skills.
    This can be used to better evaluate answers in the context of the specific job.
    
    Args:
        job_description: Description of the job
        skills: List of required skills for the job
        
    Returns:
        Dictionary containing job context information
    """
    # Extract key information from job description
    key_terms = []
    for skill in skills:
        if skill.lower() in job_description.lower():
            key_terms.append(skill)
    
    # Simple context structure for now - this could be enhanced with embeddings
    return {
        "key_skills": skills[:10] if skills else [],
        "key_terms": key_terms[:20],
        "description_summary": job_description[:500]
    }

# Sample usage example
if __name__ == "__main__":
    # Initialize models
    init_models()
    
    # Test transcription with a dummy base64 string (would be an actual audio file in production)
    # audio_base64 = "..."
    # text = transcribe_audio(audio_base64)
    # print(f"Transcribed text: {text}")
    
    # Test evaluation
    question = "Tell me about your experience with Python programming."
    answer = "I've been using Python for about 3 years now. I've built several web applications using Django and have experience with data analysis using pandas and numpy. I've also worked on machine learning projects using scikit-learn and TensorFlow."
    job_description = "We're looking for a Python developer with experience in web development and machine learning."
    skills = ["Python", "Django", "Flask", "Pandas", "TensorFlow"]
    
    evaluation = evaluate_answer(question, answer, job_description, skills)
    print(json.dumps(evaluation, indent=2)) 