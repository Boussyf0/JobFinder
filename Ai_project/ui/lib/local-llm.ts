// import { WebLLM } from '@mlc-ai/web-llm';
import type { InterviewQuestion, InterviewEvaluation } from './api';

// Define a WebLLM interface to match the expected structure
interface WebLLM {
  reload(config: any): Promise<void>;
  generate(prompt: string, options: any): Promise<{output: string}>;
}

// Cache the model instance
let llmInstance: WebLLM | null = null;

// Initialize the LLM model (do this early in the app lifecycle)
export async function initLocalLLM() {
  try {
    console.log('Initializing local LLM model...');
    // Use Phi-2 as it's compact (2.7B) and has good performance for targeted tasks
    const modelName = 'Phi-2:Q4_K_M'; // Quantized version for better performance
    
    // Instead of creating a new instance, check if the class is available in window
    if (typeof window !== 'undefined' && (window as any).WebLLM) {
      llmInstance = new (window as any).WebLLM();
      
      if (llmInstance) {
        await llmInstance.reload({
          model: modelName,
          // Download model from Hugging Face or other CDN
          modelUrl: 'https://huggingface.co/mlc-ai/phi-2-q4km/resolve/main/',
          // Can be configured based on device capabilities
          maxTokens: 1024
        });
      }
    } else {
      console.warn('WebLLM not available in window, using mock implementation');
      // Create a mock implementation if the real one isn't available
      llmInstance = createMockWebLLM();
    }
    
    console.log('Local LLM initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize local LLM:', error);
    llmInstance = null;
    return false;
  }
}

// Create a mock WebLLM implementation for testing or when the real one isn't available
function createMockWebLLM(): WebLLM {
  return {
    reload: async () => {
      console.log('Mock WebLLM: reload called');
      return Promise.resolve();
    },
    generate: async (prompt: string, options: any) => {
      console.log('Mock WebLLM: generate called, using test server');
      try {
        // Use our test server LLM endpoint
        const response = await fetch('http://localhost:3008/api/llm/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            max_tokens: options?.max_gen_len || 512,
            temperature: options?.temperature || 0.7,
            model: 'local-simulation-model'
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        return { output: data.output };
      } catch (error) {
        console.error('Error calling test server LLM:', error);
        // Fallback to hardcoded response
        return Promise.resolve({
          output: 'This is a fallback response from the simulated WebLLM when the test server is unavailable.'
        });
      }
    }
  };
}

// Check if the LLM is available
export function isLocalLLMAvailable(): boolean {
  return llmInstance !== null;
}

// Generate interview questions based on job details
export async function generateQuestionsLocally(
  jobTitle: string,
  jobDescription: string,
  jobSkills: string[],
  numQuestions: number = 5
): Promise<InterviewQuestion[]> {
  try {
    if (!llmInstance) {
      console.warn('Local LLM not initialized. Using test server directly.');
      return await generateQuestionsFromTestServer(jobTitle, jobDescription, jobSkills, numQuestions);
    }
    
    const skillsText = jobSkills.join(', ');
    
    const prompt = `
Generate ${numQuestions} professional interview questions for a ${jobTitle} position.
The job requires skills in: ${skillsText}
Job description: ${jobDescription.substring(0, 500)}...

The questions should test both technical knowledge and soft skills relevant to this role.
Format the response as a JSON array with each question having an id and question text.
Example: [{"id": 1, "question": "What experience do you have with...?"}, ...]
`;

    try {
      const response = await llmInstance.generate(prompt, {
        max_gen_len: 512,
        temperature: 0.7
      });
      
      try {
        // Find the JSON array in the response
        const jsonMatch = response.output.match(/\[\s*\{\s*"id".*\}\s*\]/);
        if (jsonMatch) {
          const questions = JSON.parse(jsonMatch[0]) as InterviewQuestion[];
          return questions.slice(0, numQuestions); // Ensure we have exactly the requested number
        }
        
        // Fallback parsing if the model didn't format properly
        const lines = response.output
          .split('\n')
          .filter((line: string) => line.trim().length > 0)
          .filter((line: string) => /^\d+[\.\):]/.test(line));
        
        return lines.slice(0, numQuestions).map((line: string, index: number) => {
          const question = line.replace(/^\d+[\.\):]\s*/, '').trim();
          return { id: index + 1, question };
        });
      } catch (parseError) {
        console.error('Error parsing LLM response:', parseError);
        // Use test server as fallback
        return await generateQuestionsFromTestServer(jobTitle, jobDescription, jobSkills, numQuestions);
      }
    } catch (error) {
      console.error('Error generating questions with local LLM:', error);
      // Use test server as fallback
      return await generateQuestionsFromTestServer(jobTitle, jobDescription, jobSkills, numQuestions);
    }
  } catch (error) {
    console.error('All question generation methods failed:', error);
    // Emergency fallback with generic questions
    return Array.from({ length: numQuestions }, (_, i) => ({
      id: i + 1,
      question: `Question ${i + 1}: Tell me about your experience with ${jobSkills[i % jobSkills.length] || 'this role'}.`
    }));
  }
}

// Helper function to generate questions using the test server
async function generateQuestionsFromTestServer(
  jobTitle: string,
  jobDescription: string,
  jobSkills: string[],
  numQuestions: number = 5
): Promise<InterviewQuestion[]> {
  try {
    console.log('Using test server to generate interview questions');
    
    // Create a mock job ID
    const jobId = 'job-' + Math.random().toString(36).substring(2, 8);
    
    // Call the test server
    const response = await fetch('http://localhost:3008/api/interview/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        job_id: jobId,
        num_questions: numQuestions,
        resume_text: JSON.stringify({
          jobTitle,
          jobDescription: jobDescription.substring(0, 500),
          skills: jobSkills
        })
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.questions || !Array.isArray(data.questions)) {
      throw new Error('Invalid response format from test server');
    }
    
    return data.questions;
  } catch (error) {
    console.error('Error generating questions from test server:', error);
    throw error;
  }
}

// Evaluate an interview answer locally
export async function evaluateAnswerLocally(
  question: string,
  answer: string,
  jobTitle: string,
  jobSkills: string[]
): Promise<InterviewEvaluation> {
  try {
    if (!llmInstance) {
      console.warn('Local LLM not initialized. Using test server directly.');
      return await evaluateAnswerFromTestServer(question, answer, jobTitle);
    }
    
    const skillsText = jobSkills.join(', ');
    
    const prompt = `
You are an AI interview evaluator for a ${jobTitle} position that requires skills in: ${skillsText}.

Question: "${question}"
Candidate's answer: "${answer}"

Evaluate the answer on a scale of 1-10 for:
- Relevance to the question
- Demonstrated knowledge
- Clarity of communication
- Use of specific examples
- Overall quality

Then provide:
1. Key strengths of the answer
2. Areas for improvement
3. A final rating between 1-10
4. A brief suggestion for improving the answer

Format your response as a JSON object with these sections.
`;

    try {
      const response = await llmInstance.generate(prompt, {
        max_gen_len: 512,
        temperature: 0.3 // Lower temperature for more consistent evaluations
      });
      
      try {
        // Try to extract a JSON object from the response
        const jsonMatch = response.output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const json = JSON.parse(jsonMatch[0]);
          
          // Format into the expected interface structure
          return {
            scores: {
              relevance: json.relevance || json.scores?.relevance || 5,
              knowledge: json.knowledge || json.scores?.knowledge || 5,
              clarity: json.clarity || json.scores?.clarity || 5,
              examples: json.examples || json.scores?.examples || 5,
              overall: json.overall || json.scores?.overall || 5
            },
            analysis: {
              strengths: Array.isArray(json.strengths) ? json.strengths : 
                        (json.analysis?.strengths || ['Good attempt']),
              improvements: Array.isArray(json.improvements) ? json.improvements : 
                          (json.analysis?.improvements || ['Could provide more specific examples'])
            },
            rating: json.rating || json.overall || 5,
            suggestion: json.suggestion || 'Consider providing more specific examples from your experience.'
          };
        }
        
        // Use test server if JSON parsing fails
        console.warn('Could not parse LLM response as JSON, using test server');
        return await evaluateAnswerFromTestServer(question, answer, jobTitle);
      } catch (parseError) {
        console.error('Error parsing LLM evaluation response:', parseError);
        // Use test server as fallback
        return await evaluateAnswerFromTestServer(question, answer, jobTitle);
      }
    } catch (error) {
      console.error('Error evaluating answer with local LLM:', error);
      // Use test server as fallback
      return await evaluateAnswerFromTestServer(question, answer, jobTitle);
    }
  } catch (error) {
    console.error('All evaluation methods failed:', error);
    // Emergency fallback with generic evaluation
    return {
      scores: {
        relevance: 5,
        knowledge: 5,
        clarity: 5,
        examples: 5,
        overall: 5
      },
      analysis: {
        strengths: ['Attempted to answer the question'],
        improvements: ['Local evaluation encountered an error']
      },
      rating: 5,
      suggestion: 'Our evaluation system encountered an error. Please try again later.'
    };
  }
}

// Helper function to evaluate answers using the test server
async function evaluateAnswerFromTestServer(
  question: string,
  answer: string,
  jobTitle: string
): Promise<InterviewEvaluation> {
  try {
    console.log('Using test server to evaluate interview answer');
    
    // Create a mock job ID
    const jobId = 'job-' + Math.random().toString(36).substring(2, 8);
    
    // Call the test server
    const response = await fetch('http://localhost:3008/api/interview/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        job_id: jobId,
        question,
        answer
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.evaluation) {
      throw new Error('Invalid response format from test server');
    }
    
    return data.evaluation;
  } catch (error) {
    console.error('Error evaluating answer from test server:', error);
    throw error;
  }
}

// Utility function to check if local processing should be used instead of API
export function shouldUseLocalLLM(forceLocal: boolean = false): boolean {
  return forceLocal || isLocalLLMAvailable();
} 