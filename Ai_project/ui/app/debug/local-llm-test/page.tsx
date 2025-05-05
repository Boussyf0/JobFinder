'use client';

import type { InterviewEvaluation, InterviewQuestion } from '@/lib/api';
import {
    evaluateAnswerLocally,
    generateQuestionsLocally,
    initLocalLLM,
    isLocalLLMAvailable
} from '@/lib/local-llm';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function LocalLLMTestPage() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState('Not initialized');
  const [error, setError] = useState<string | null>(null);
  
  // Test job details
  const [jobTitle, setJobTitle] = useState('Frontend Developer');
  const [jobDescription, setJobDescription] = useState('We are looking for a skilled Frontend Developer proficient in React, TypeScript, and modern web technologies to build responsive user interfaces.');
  const [jobSkills, setJobSkills] = useState(['React', 'TypeScript', 'HTML', 'CSS', 'JavaScript']);
  
  // Test question generation
  const [generatedQuestions, setGeneratedQuestions] = useState<InterviewQuestion[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);
  
  // Test answer evaluation
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  
  // Initialize LLM on component mount
  useEffect(() => {
    checkLLMStatus();
  }, []);
  
  const checkLLMStatus = () => {
    const available = isLocalLLMAvailable();
    setIsInitialized(available);
    setStatus(available ? 'Initialized' : 'Not initialized');
  };
  
  const handleInitialize = async () => {
    setIsInitializing(true);
    setError(null);
    setStatus('Initializing...');
    
    try {
      const success = await initLocalLLM();
      setIsInitialized(success);
      setStatus(success ? 'Initialized successfully' : 'Initialization failed');
    } catch (err) {
      setError(`Error initializing LLM: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('Error during initialization');
    } finally {
      setIsInitializing(false);
    }
  };
  
  const handleGenerateQuestions = async () => {
    if (!isInitialized) {
      setQuestionError('LLM not initialized. Please initialize first.');
      return;
    }
    
    setIsGeneratingQuestions(true);
    setQuestionError(null);
    
    try {
      const questions = await generateQuestionsLocally(
        jobTitle,
        jobDescription,
        jobSkills,
        3 // Limit to 3 questions for testing
      );
      
      setGeneratedQuestions(questions);
      if (questions.length > 0) {
        setSelectedQuestion(questions[0].question);
      }
    } catch (err) {
      setQuestionError(`Error generating questions: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };
  
  const handleEvaluateAnswer = async () => {
    if (!isInitialized) {
      setEvaluationError('LLM not initialized. Please initialize first.');
      return;
    }
    
    if (!selectedQuestion || !answer) {
      setEvaluationError('Please provide both a question and an answer.');
      return;
    }
    
    setIsEvaluating(true);
    setEvaluationError(null);
    
    try {
      const result = await evaluateAnswerLocally(
        selectedQuestion,
        answer,
        jobTitle,
        jobSkills
      );
      
      setEvaluation(result);
    } catch (err) {
      setEvaluationError(`Error evaluating answer: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsEvaluating(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      {/* Navigation Links */}
      <div className="mb-6 flex space-x-4 items-center">
        <Link href="/debug" className="text-blue-600 hover:text-blue-800">
          ← Back to Debug
        </Link>
        <span className="text-gray-400">|</span>
        <Link href="/" className="text-blue-600 hover:text-blue-800">
          Home
        </Link>
      </div>
      
      <h1 className="text-2xl font-bold mb-6">Local LLM Testing</h1>
      
      {/* LLM Status & Initialization */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-2">LLM Status</h2>
        <p className="mb-2">Status: <span className={`font-medium ${isInitialized ? 'text-green-600' : 'text-red-600'}`}>{status}</span></p>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-md mb-3">
            {error}
          </div>
        )}
        
        <button
          onClick={handleInitialize}
          disabled={isInitializing}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isInitializing ? 'Initializing...' : 'Initialize LLM'}
        </button>
      </div>
      
      {/* Job Details */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-2">Job Details</h2>
        
        <div className="mb-3">
          <label className="block mb-1">Job Title</label>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        
        <div className="mb-3">
          <label className="block mb-1">Job Description</label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="w-full px-3 py-2 border rounded h-24"
          />
        </div>
        
        <div className="mb-3">
          <label className="block mb-1">Skills (comma-separated)</label>
          <input
            type="text"
            value={jobSkills.join(', ')}
            onChange={(e) => setJobSkills(e.target.value.split(',').map(s => s.trim()))}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
      </div>
      
      {/* Question Generation */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-2">Generate Interview Questions</h2>
        
        {questionError && (
          <div className="bg-red-100 text-red-700 p-3 rounded-md mb-3">
            {questionError}
          </div>
        )}
        
        <button
          onClick={handleGenerateQuestions}
          disabled={isGeneratingQuestions || !isInitialized}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 mb-4"
        >
          {isGeneratingQuestions ? 'Generating...' : 'Generate Questions'}
        </button>
        
        {generatedQuestions.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Generated Questions:</h3>
            <ul className="list-disc pl-5">
              {generatedQuestions.map((q) => (
                <li key={q.id} className="mb-2">
                  {q.question}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Answer Evaluation */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-2">Evaluate Answer</h2>
        
        <div className="mb-3">
          <label className="block mb-1">Select Question</label>
          <select
            value={selectedQuestion}
            onChange={(e) => setSelectedQuestion(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            {generatedQuestions.length === 0 && (
              <option value="">No questions generated yet</option>
            )}
            {generatedQuestions.map((q) => (
              <option key={q.id} value={q.question}>
                {q.question}
              </option>
            ))}
          </select>
        </div>
        
        <div className="mb-3">
          <label className="block mb-1">Your Answer</label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full px-3 py-2 border rounded h-32"
            placeholder="Type your answer here..."
          />
        </div>
        
        {evaluationError && (
          <div className="bg-red-100 text-red-700 p-3 rounded-md mb-3">
            {evaluationError}
          </div>
        )}
        
        <button
          onClick={handleEvaluateAnswer}
          disabled={isEvaluating || !isInitialized || !selectedQuestion || !answer}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
        >
          {isEvaluating ? 'Evaluating...' : 'Evaluate Answer'}
        </button>
        
        {evaluation && (
          <div className="mt-4 p-4 bg-white rounded-lg border">
            <h3 className="font-medium mb-2">Evaluation Results:</h3>
            
            <div className="grid grid-cols-5 gap-2 mb-4">
              <div className="text-center">
                <div className="font-medium">Relevance</div>
                <div className="text-lg">{evaluation.scores.relevance}/10</div>
              </div>
              <div className="text-center">
                <div className="font-medium">Knowledge</div>
                <div className="text-lg">{evaluation.scores.knowledge}/10</div>
              </div>
              <div className="text-center">
                <div className="font-medium">Clarity</div>
                <div className="text-lg">{evaluation.scores.clarity}/10</div>
              </div>
              <div className="text-center">
                <div className="font-medium">Examples</div>
                <div className="text-lg">{evaluation.scores.examples}/10</div>
              </div>
              <div className="text-center">
                <div className="font-medium">Overall</div>
                <div className="text-lg font-bold">{evaluation.scores.overall}/10</div>
              </div>
            </div>
            
            <div className="mb-3">
              <h4 className="font-medium text-green-700">Strengths:</h4>
              <ul className="list-disc pl-5">
                {evaluation.analysis.strengths.map((strength, i) => (
                  <li key={i}>{strength}</li>
                ))}
              </ul>
            </div>
            
            <div className="mb-3">
              <h4 className="font-medium text-amber-700">Areas for Improvement:</h4>
              <ul className="list-disc pl-5">
                {evaluation.analysis.improvements.map((improvement, i) => (
                  <li key={i}>{improvement}</li>
                ))}
              </ul>
            </div>
            
            <div className="bg-gray-100 p-3 rounded">
              <h4 className="font-medium">Suggestion:</h4>
              <p>{evaluation.suggestion}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 