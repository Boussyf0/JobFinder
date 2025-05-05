// Simple Express server to test the behavior analysis API route
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3008;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Mock behavioral analysis response
const mockBehavioralAnalysis = {
  success: true,
  session_id: '',
  frame_count: 10,
  behavior_analysis: {
    attention_score: 85,
    suspicious_activity: false,
    present_percentage: 92,
    looking_away_percentage: 8,
    centered_percentage: 95,
    rapid_movements_count: 1,
    message: "Candidate maintained good posture and attention throughout the interview."
  }
};

// Mock coding evaluation response
const mockCodingEvaluation = {
  success: true,
  job_id: '',
  job_title: 'Software Developer',
  language: 'javascript',
  evaluation: {
    scores: {
      correctness: 8,
      efficiency: 7,
      style: 8,
      readability: 9,
      overall: 8
    },
    analysis: {
      strengths: [
        "Good solution structure and organization",
        "Efficient algorithm implementation",
        "Readable variable names and comments"
      ],
      improvements: [
        "Consider edge cases such as empty inputs",
        "Add more error handling for robustness"
      ]
    },
    code_issues: [],
    rating: 8,
    suggestion: "Overall good solution. Consider adding more error handling for edge cases."
  }
};

// Local LLM simulation endpoint
app.post('/api/interview/generate', (req, res) => {
  console.log('interview question generation API route triggered');
  
  try {
    const { job_id, num_questions = 5, resume_text } = req.body;
    
    console.log(`Generating ${num_questions} interview questions for job ${job_id}`);
    if (resume_text) {
      console.log(`Resume length: ${resume_text.length} characters`);
    }
    
    // Generate questions based on common interview topics
    const questions = [
      {
        id: 1,
        question: "Why are you interested in this Python Developer position?"
      },
      {
        id: 2,
        question: "How do you stay updated with the latest trends and technologies in your field?"
      },
      {
        id: 3,
        question: "Describe a challenging situation you faced while working with SQL and how you resolved it."
      },
      {
        id: 4,
        question: "Describe your ideal work environment."
      },
      {
        id: 5,
        question: "What are your greatest professional strengths and how do they relate to this position?"
      },
      {
        id: 6,
        question: "Tell me about a project where you had to learn a new technology quickly."
      },
      {
        id: 7,
        question: "How do you handle tight deadlines and pressure?"
      }
    ];
    
    // Limit to requested number of questions
    const selectedQuestions = questions.slice(0, num_questions);
    
    // Return the generated questions
    const response = {
      job_id,
      job_title: 'Software Developer',
      questions: selectedQuestions,
      success: true
    };
    
    console.log(`Returning ${selectedQuestions.length} interview questions`);
    return res.json(response);
    
  } catch (error) {
    console.error('Error in question generation API route:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'An error occurred while generating interview questions',
      job_id: req.body?.job_id || 'unknown'
    });
  }
});

// Local LLM model endpoint to simulate WebLLM
app.post('/api/llm/generate', (req, res) => {
  console.log('LLM generate API route triggered');
  
  try {
    const { prompt, max_tokens, temperature, model } = req.body;
    
    console.log(`Processing LLM generation with model: ${model || 'default'}`);
    console.log(`Prompt length: ${prompt.length} characters`);
    
    // Simulate a delay for processing
    setTimeout(() => {
      // Return a simple mock response
      const response = {
        output: `This is a simulated response from the local LLM model.
        
Based on your input, here's what I can provide:

1. The requested information is simulated
2. LLM functionality is working properly
3. Your prompt has been processed successfully

I'm a local model simulation providing this response to prevent "backend prediction service unavailable" errors.`,
        model: model || "local-simulation-model",
        usage: {
          prompt_tokens: prompt.length / 4, // Rough approximation
          completion_tokens: 150,
          total_tokens: (prompt.length / 4) + 150
        }
      };
      
      console.log('Returning LLM generation response');
      return res.json(response);
    }, 500); // Simulate a 500ms delay
    
  } catch (error) {
    console.error('Error in LLM generation API route:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'An error occurred during LLM generation',
      model: req.body?.model || 'unknown'
    });
  }
});

// Transcribe endpoint for speech-to-text
app.post('/api/interview/transcribe', (req, res) => {
  console.log('transcribe audio API route triggered');
  
  try {
    const { audio } = req.body;
    
    console.log(`Processing audio with length: ${audio?.length || 0} characters`);
    
    // Simulate transcription result
    const response = {
      text: "This is a simulated transcription of your speech. In a real implementation, this would be the text converted from your audio recording. The simulation allows testing without backend services.",
      success: true
    };
    
    console.log('Returning simulated transcription');
    return res.json(response);
    
  } catch (error) {
    console.error('Error in transcribe API route:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'An error occurred while transcribing audio',
      text: ''
    });
  }
});

// Analyze behavior endpoint
app.post('/api/interview/analyze-behavior', (req, res) => {
  console.log('analyze-behavior API route triggered');
  
  try {
    const { session_id, clear_session } = req.body;
    
    console.log(`Processing behavior analysis for session ${session_id}, clear_session=${clear_session}`);
    
    // If it's a clear session request, return success immediately
    if (clear_session) {
      console.log('Session cleanup requested, returning success');
      return res.json({
        success: true,
        session_id,
        message: 'Session cleared successfully'
      });
    }
    
    // Return mock data
    console.log('Returning mock behavioral analysis');
    return res.json({
      ...mockBehavioralAnalysis,
      session_id
    });
    
  } catch (error) {
    console.error('Error in analyze-behavior API route:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'An error occurred while analyzing candidate behavior',
      session_id: req.body?.session_id || 'unknown'
    });
  }
});

// Interview answer evaluation endpoint
app.post('/api/interview/evaluate', (req, res) => {
  console.log('interview evaluation API route triggered');
  
  try {
    const { job_id, question, answer } = req.body;
    
    console.log(`Processing interview evaluation for job ${job_id}`);
    console.log(`Question: ${question.substring(0, 100)}...`);
    console.log(`Answer length: ${answer.length} characters`);
    
    // Simple answer analysis based on length and keyword matching
    const wordCount = answer.split(/\s+/).length;
    let relevanceScore = 5;
    let knowledgeScore = 5;
    let clarityScore = 5;
    let examplesScore = 5;
    let overallRating = 5;
    
    // Generate dynamic feedback based on answer content
    const strengths = [];
    const improvements = [];
    
    // Check answer length for basic evaluation
    if (wordCount < 20) {
      clarityScore = 3;
      strengths.push("You got straight to the point");
      improvements.push("Your answer is quite brief. Consider expanding with more details");
    } else if (wordCount > 100) {
      clarityScore = 7;
      strengths.push("You provided a comprehensive response");
      improvements.push("Consider making your answer more concise for clarity");
    }
    
    // Check for keywords relevant to common interview questions
    if (question.toLowerCase().includes("experience") || question.toLowerCase().includes("background")) {
      if (answer.toLowerCase().includes("experience") || answer.toLowerCase().includes("worked") || answer.toLowerCase().includes("project")) {
        relevanceScore = 8;
        knowledgeScore = 7;
        strengths.push("You shared relevant experience");
      } else {
        relevanceScore = 4;
        improvements.push("Try to include specific relevant experiences");
      }
    }
    
    // Check for examples
    if (answer.toLowerCase().includes("example") || answer.toLowerCase().includes("instance") || answer.toLowerCase().includes("case")) {
      examplesScore = 8;
      strengths.push("You provided concrete examples");
    } else {
      examplesScore = 4;
      improvements.push("Include specific examples to illustrate your points");
    }
    
    // Look for structure indicators
    if (answer.toLowerCase().includes("first") && (answer.toLowerCase().includes("second") || answer.toLowerCase().includes("then"))) {
      clarityScore = 8;
      strengths.push("Your answer has good structure");
    }
    
    // Calculate overall rating based on individual scores
    overallRating = Math.round((relevanceScore + knowledgeScore + clarityScore + examplesScore) / 4);
    
    // Ensure we have at least some feedback
    if (strengths.length === 0) {
      strengths.push("You addressed the question");
    }
    
    if (improvements.length === 0) {
      improvements.push("Consider providing more specific details");
    }
    
    // Create dynamic suggestion based on scores
    let suggestion = "";
    if (overallRating >= 7) {
      suggestion = "Strong answer! You demonstrated good knowledge and communication skills.";
    } else if (overallRating >= 5) {
      suggestion = "Solid answer with room for improvement. Consider addressing the suggested improvements.";
    } else {
      suggestion = "Your answer needs improvement. Focus on being more specific and addressing the question directly.";
    }
    
    // Return dynamic evaluation
    const evaluation = {
      job_id,
      job_title: 'Software Developer',
      question,
      answer,
      evaluation: {
        scores: {
          relevance: relevanceScore,
          knowledge: knowledgeScore,
          clarity: clarityScore,
          examples: examplesScore,
          overall: overallRating
        },
        analysis: {
          strengths,
          improvements
        },
        rating: overallRating,
        suggestion
      },
      success: true
    };
    
    console.log('Returning dynamic interview evaluation');
    return res.json(evaluation);
    
  } catch (error) {
    console.error('Error in interview evaluation API route:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'An error occurred while evaluating the interview answer',
      job_id: req.body?.job_id || 'unknown'
    });
  }
});

// Coding evaluation endpoint
app.post('/api/interview/coding', (req, res) => {
  console.log('coding evaluation API route triggered');
  
  try {
    const { job_id, language, problem, solution } = req.body;
    
    console.log(`Processing coding evaluation for job ${job_id}, language: ${language}`);
    console.log(`Problem: ${problem.substring(0, 50)}...`);
    console.log(`Solution length: ${solution.length} characters`);
    
    // Dynamic evaluation based on actual code
    const codeEvaluation = evaluateCode(solution, problem, language);
    
    // Return dynamic evaluation
    const response = {
      success: true,
      job_id,
      job_title: 'Software Developer',
      language: language || 'javascript',
      evaluation: codeEvaluation
    };
    
    console.log('Returning dynamic coding evaluation');
    return res.json(response);
    
  } catch (error) {
    console.error('Error in coding evaluation API route:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'An error occurred while evaluating the coding solution',
      job_id: req.body?.job_id || 'unknown',
      language: req.body?.language || 'unknown'
    });
  }
});

// Function to evaluate code solutions
function evaluateCode(solution, problem, language) {
  let correctnessScore = 5;
  let efficiencyScore = 5;
  let styleScore = 5;
  let readabilityScore = 5;
  let overallScore = 5;
  
  const strengths = [];
  const improvements = [];
  const codeIssues = [];
  
  // Check for empty solution
  if (!solution || solution.trim().length === 0) {
    return {
      scores: {
        correctness: 0,
        efficiency: 0,
        style: 0,
        readability: 0,
        overall: 0
      },
      analysis: {
        strengths: [],
        improvements: ["Please provide a solution"]
      },
      code_issues: [],
      rating: 0,
      suggestion: "No solution provided"
    };
  }
  
  // Count lines of code (excluding blank lines)
  const lines = solution.split('\n').filter(line => line.trim().length > 0);
  const lineCount = lines.length;
  
  // Basic readability checks
  if (solution.includes('// ') || solution.includes('/* ')) {
    readabilityScore = 8;
    strengths.push("Good use of comments");
  } else {
    readabilityScore = 4;
    improvements.push("Add comments to explain your solution");
  }
  
  // Check function/class existence based on problem
  if (problem.toLowerCase().includes("function") && !solution.includes("function")) {
    correctnessScore = 3;
    codeIssues.push({
      line: 1,
      message: "Function implementation missing"
    });
    improvements.push("Implement a function as required by the problem");
  } else if (problem.toLowerCase().includes("class") && !solution.includes("class")) {
    correctnessScore = 3;
    codeIssues.push({
      line: 1,
      message: "Class implementation missing"
    });
    improvements.push("Implement a class as required by the problem");
  }
  
  // Check for common coding practices
  if (language === 'javascript') {
    // Check if code has variable declarations
    if (solution.includes('let ') || solution.includes('const ')) {
      styleScore = 7;
      strengths.push("Good use of modern variable declarations");
    } else if (solution.includes('var ')) {
      styleScore = 4;
      improvements.push("Consider using let/const instead of var for better scoping");
    }
    
    // Check for error handling
    if (solution.includes('try') && solution.includes('catch')) {
      correctnessScore = 8;
      strengths.push("Included error handling");
    } else if (solution.includes('if') && solution.includes('throw')) {
      correctnessScore = 7;
      strengths.push("Included basic error checking");
    } else {
      improvements.push("Consider adding error handling");
    }
    
    // Check for max/array problem solution correctness
    if (problem.toLowerCase().includes("maximum") || problem.toLowerCase().includes("max")) {
      if (solution.includes('Math.max')) {
        correctnessScore = 9;
        efficiencyScore = 8;
        strengths.push("Used efficient built-in method");
      } else if (solution.includes('for') || solution.includes('forEach') || solution.includes('reduce')) {
        correctnessScore = 7;
        strengths.push("Used iteration to find maximum");
      }
    }
    
    // Check for character frequency solution
    if (problem.toLowerCase().includes("frequency") && problem.toLowerCase().includes("character")) {
      if (solution.includes('Map') || solution.includes('{}') || solution.includes('Object.')) {
        correctnessScore = 8;
        strengths.push("Used appropriate data structure for frequency counting");
      }
    }
    
    // Check for stack implementation
    if (problem.toLowerCase().includes("stack")) {
      if (solution.includes('push') && solution.includes('pop')) {
        correctnessScore = 8;
        strengths.push("Implemented core stack operations");
      } else {
        improvements.push("Ensure stack has proper push/pop operations");
      }
    }
  }
  
  // Calculate overall score
  overallScore = Math.round((correctnessScore + efficiencyScore + styleScore + readabilityScore) / 4);
  
  // Ensure we have at least some feedback
  if (strengths.length === 0) {
    strengths.push("You provided a solution to the problem");
  }
  
  // Create suggestion based on scores
  let suggestion = "";
  if (overallScore >= 7) {
    suggestion = "Excellent solution! Your code demonstrates good understanding of programming concepts.";
  } else if (overallScore >= 5) {
    suggestion = "Good solution with room for improvement. Consider addressing the suggested improvements.";
  } else {
    suggestion = "Your solution needs improvement. Focus on correctness and readability.";
  }
  
  return {
    scores: {
      correctness: correctnessScore,
      efficiency: efficiencyScore,
      style: styleScore,
      readability: readabilityScore,
      overall: overallScore
    },
    analysis: {
      strengths,
      improvements
    },
    code_issues: codeIssues,
    rating: overallScore,
    suggestion
  };
}

// Start the server
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log(`Behavior analysis endpoint: http://localhost:${PORT}/api/interview/analyze-behavior`);
  console.log(`Interview evaluation endpoint: http://localhost:${PORT}/api/interview/evaluate`);
  console.log(`Coding evaluation endpoint: http://localhost:${PORT}/api/interview/coding`);
  console.log(`Interview generation endpoint: http://localhost:${PORT}/api/interview/generate`);
  console.log(`LLM generation endpoint: http://localhost:${PORT}/api/llm/generate`);
  console.log(`Audio transcription endpoint: http://localhost:${PORT}/api/interview/transcribe`);
}); 