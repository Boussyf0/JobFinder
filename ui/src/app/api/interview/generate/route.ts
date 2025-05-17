import { NextResponse } from 'next/server';
import axios from 'axios';

// The API backend URL
const API_BACKEND_URL = process.env.NEXT_PUBLIC_API_BACKEND_URL || 'http://localhost:5001';

export async function POST(request: Request) {
  try {
    // Extract request body
    const body = await request.json();
    
    if (!body.job_id) {
      return NextResponse.json(
        { error: 'No job ID provided' },
        { status: 400 }
      );
    }

    try {
      // Try to call the Python backend API
      const response = await axios.post(`${API_BACKEND_URL}/api/interview/generate`, {
        job_id: body.job_id,
        resume_text: body.resume_text || '',
        num_questions: body.num_questions || 5
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 seconds timeout
      });

      // Return the backend response directly
      return NextResponse.json(response.data);
    } catch (apiError) {
      console.log('Backend API not available, using mock implementation');
      
      // Get job title from request or use default
      const jobTitle = body.job_title || "Professional";
      
      // Generate job-specific questions
      const questions = generateMockQuestions(jobTitle, body.num_questions || 5);
      
      // Simulate API response delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Return mock data
      return NextResponse.json({
        job_id: body.job_id,
        job_title: jobTitle,
        questions: questions
      });
    }
  } catch (error: any) {
    console.error('Error generating interview questions:', error);
    const status = error.response?.status || 500;
    const errorMessage = error.response?.data?.error || error.message || 'Failed to generate interview questions';
    
    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
}

// Function to generate job-specific mock questions
function generateMockQuestions(jobTitle: string, numQuestions: number): Array<{id: number, question: string}> {
  // Common interview questions for any position
  const commonQuestions = [
    "Tell me about yourself and your background.",
    "What are your greatest professional strengths?",
    "What do you consider to be your weaknesses?",
    "Where do you see yourself in five years?",
    "Why are you interested in this position?",
    "Describe a challenging situation you've faced at work and how you handled it.",
    "How do you handle pressure and stressful situations?",
    "What is your greatest professional achievement?",
    "Tell me about a time you demonstrated leadership skills.",
    "How do you prioritize your work when dealing with multiple deadlines?"
  ];
  
  // Job-specific questions based on job title keywords
  const jobSpecificQuestions: Record<string, string[]> = {
    // Software/IT related questions
    'software': [
      "Explain your experience with software development methodologies like Agile or Scrum.",
      "What programming languages are you most proficient in and why?",
      "Describe a complex technical problem you solved and your approach to solving it.",
      "How do you stay updated with the latest technology trends?",
      "Tell me about a project where you had to learn a new technology quickly.",
      "How do you approach testing and debugging in your development process?",
      "Explain your experience with version control systems.",
      "How do you ensure your code is maintainable and scalable?",
      "Describe your experience working in cross-functional development teams.",
      "How do you handle technical disagreements with team members?"
    ],
    
    // Marketing related questions
    'marketing': [
      "Describe a successful marketing campaign you've managed.",
      "How do you measure the success of a marketing initiative?",
      "What marketing tools and platforms are you familiar with?",
      "How do you stay updated with the latest marketing trends?",
      "Tell me about your experience with social media marketing.",
      "How do you approach audience segmentation and targeting?",
      "Describe your experience with content marketing strategies.",
      "How do you analyze marketing data to drive decisions?",
      "Tell me about a marketing campaign that didn't meet expectations and what you learned.",
      "How do you balance creativity and analytics in your marketing approach?"
    ],
    
    // Engineering related questions
    'engineer': [
      "Describe a complex engineering problem you solved.",
      "What engineering tools or software are you proficient with?",
      "How do you ensure quality and safety in your engineering work?",
      "Tell me about a project where you had to work under significant constraints.",
      "How do you approach troubleshooting and problem-solving?",
      "Describe your experience with engineering documentation.",
      "How do you stay updated with industry standards and regulations?",
      "Tell me about your experience working with cross-functional teams.",
      "How do you handle technical disagreements with colleagues?",
      "Describe a situation where you had to make a difficult engineering decision."
    ],
    
    // Data science related questions
    'data': [
      "Describe your experience with data analysis and visualization tools.",
      "How do you approach cleaning and preprocessing data?",
      "Tell me about a complex data analysis project you've worked on.",
      "How do you ensure the accuracy and reliability of your data models?",
      "Describe your experience with machine learning algorithms.",
      "How do you communicate technical findings to non-technical stakeholders?",
      "What's your approach to feature selection and engineering?",
      "How do you validate your models and prevent overfitting?",
      "Describe your experience with big data technologies.",
      "How do you stay updated with the latest developments in data science?"
    ],
    
    // Management related questions
    'manager': [
      "Describe your management style.",
      "How do you motivate your team members?",
      "Tell me about a time when you had to handle a difficult employee situation.",
      "How do you delegate tasks and responsibilities?",
      "Describe how you set goals and track progress for your team.",
      "How do you handle conflicts within your team?",
      "Tell me about your experience with performance reviews and feedback.",
      "How do you approach hiring and building a team?",
      "Describe a situation where you had to implement an unpopular change.",
      "How do you balance team needs with organizational objectives?"
    ]
  };
  
  // Determine which category the job title falls into
  const jobTitleLower = jobTitle.toLowerCase();
  let relevantQuestions: string[] = [...commonQuestions];
  
  Object.entries(jobSpecificQuestions).forEach(([keyword, questions]) => {
    if (jobTitleLower.includes(keyword)) {
      relevantQuestions = [...relevantQuestions, ...questions];
    }
  });
  
  // If no specific category matched, add some general professional questions
  if (relevantQuestions.length <= commonQuestions.length) {
    relevantQuestions = [
      ...relevantQuestions,
      "What do you know about our company and why do you want to work here?",
      "How would your previous colleagues describe you?",
      "What type of work environment do you prefer?",
      "How do you handle feedback and criticism?",
      "What are you looking for in your next role?"
    ];
  }
  
  // Shuffle the questions and take the requested number
  const shuffled = relevantQuestions.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, numQuestions);
  
  // Format questions with IDs
  return selected.map((question, index) => ({
    id: index + 1,
    question: question
  }));
} 