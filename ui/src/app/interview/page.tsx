'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mic, MicOff, ArrowLeft, CheckCircle, PlayCircle, PauseCircle, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import Button from '@/components/atoms/Button';

interface Question {
  id: number;
  question: string;
}

interface InterviewEvaluation {
  scores: {
    relevance: number;
    knowledge: number;
    clarity: number;
    examples: number;
    overall: number;
  };
  analysis: {
    strengths: string[];
    improvements: string[];
  };
  rating: number;
  suggestion: string;
}

// Loading fallback component
function InterviewLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
        <p className="mt-4 text-lg text-gray-700">Loading interview...</p>
      </div>
    </div>
  );
}

// Main interview component that uses the search params
function InterviewContent() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId');
  const jobTitle = searchParams.get('jobTitle') || 'This position';
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [answer, setAnswer] = useState('');
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false);
  const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);
  const [completed, setCompleted] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Load questions when the component mounts
  useEffect(() => {
    if (jobId) {
      loadInterviewQuestions();
    } else {
      setError('No job ID provided. Please select a job first.');
      setLoading(false);
    }
  }, [jobId]);
  
  const loadInterviewQuestions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.generateInterview(jobId!, undefined, 5);
      
      if (result && result.questions && result.questions.length > 0) {
        setQuestions(result.questions);
      } else {
        setError('Failed to generate interview questions.');
      }
    } catch (err: any) {
      console.error('Error loading interview questions:', err);
      setError(err.message || 'Failed to load interview questions.');
    } finally {
      setLoading(false);
    }
  };
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = handleRecordingStop;
      
      mediaRecorder.start();
      setIsRecording(true);
      setTranscript('');
      setAnswer('');
      setEvaluation(null);
    } catch (err: any) {
      console.error('Error starting recording:', err);
      setError(`Could not access microphone. ${err.message}`);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  const handleRecordingStop = async () => {
    try {
      setIsProcessingAnswer(true);
      
      // Create audio blob from recorded chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Transcribe the audio
      const transcriptionResult = await api.transcribeAudio(audioBlob);
      
      if (transcriptionResult && transcriptionResult.text) {
        setTranscript(transcriptionResult.text);
        setAnswer(transcriptionResult.text);
      } else {
        setError('Could not transcribe audio. You can still type your answer manually.');
        setAnswer('');
      }
    } catch (err: any) {
      console.error('Error processing recording:', err);
      setError(`Failed to process recording. ${err.message || 'Please try again or type your answer.'}`);
    } finally {
      setIsProcessingAnswer(false);
    }
  };
  
  const evaluateAnswer = async () => {
    if (!answer.trim()) {
      setError('Please provide an answer before evaluating.');
      return;
    }
    
    try {
      setIsProcessingAnswer(true);
      setError(null);
      
      const currentQuestion = questions[currentQuestionIndex].question;
      const evaluationResult = await api.evaluateAnswer(jobId!, currentQuestion, answer);
      
      if (evaluationResult && evaluationResult.evaluation) {
        setEvaluation(evaluationResult.evaluation);
      } else {
        setError('Could not evaluate answer. The evaluation service may be unavailable.');
      }
    } catch (err: any) {
      console.error('Error evaluating answer:', err);
      
      if (err.status === 501) {
        setError('The evaluation service is not available on the server.');
      } else {
        setError(err.message || 'Failed to evaluate answer. Please try again later.');
      }
    } finally {
      setIsProcessingAnswer(false);
    }
  };
  
  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTranscript('');
      setAnswer('');
      setEvaluation(null);
    } else {
      setCompleted(true);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-700">Preparing your interview questions...</p>
        </div>
      </div>
    );
  }
  
  if (error && questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg max-w-md text-center">
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p>{error}</p>
        </div>
        <Link href="/jobs" className="mt-4 text-indigo-600 hover:text-indigo-800 flex items-center">
          <ArrowLeft size={16} className="mr-1" /> Back to jobs
        </Link>
      </div>
    );
  }
  
  if (completed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-green-50 p-6 rounded-lg max-w-md text-center">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Completed!</h2>
          <p className="text-gray-600 mb-6">
            Congratulations on completing your practice interview for {jobTitle}.
            Continue practicing to improve your interview skills.
          </p>
          <div className="flex flex-col space-y-3">
            <Link href="/jobs" passHref>
              <Button variant="outline" fullWidth>Browse More Jobs</Button>
            </Link>
            <Button 
              variant="primary" 
              fullWidth
              onClick={() => {
                setCompleted(false);
                setCurrentQuestionIndex(0);
                setTranscript('');
                setAnswer('');
                setEvaluation(null);
              }}
            >
              Restart Interview
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/jobs" className="text-indigo-600 hover:text-indigo-800 flex items-center">
            <ArrowLeft size={16} className="mr-1" /> Back to jobs
          </Link>
        </div>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Practice Interview
            </h1>
            <p className="text-gray-600 mb-6">
              Position: {jobTitle}
            </p>
            
            <div className="mb-6">
              <div className="flex items-center">
                <div className="bg-indigo-100 text-indigo-800 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">
                  {currentQuestionIndex + 1}
                </div>
                <h2 className="text-xl font-semibold text-gray-800">
                  {questions[currentQuestionIndex]?.question}
                </h2>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Your Answer
                </label>
                <div>
                  {isRecording ? (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex items-center text-red-600 bg-red-50 px-3 py-1.5 rounded-full text-sm"
                    >
                      <MicOff size={16} className="mr-1" /> Stop Recording
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="flex items-center text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full text-sm"
                      disabled={isProcessingAnswer}
                    >
                      <Mic size={16} className="mr-1" /> Record Answer
                    </button>
                  )}
                </div>
              </div>
              
              {transcript && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md text-sm text-gray-600">
                  <p className="font-medium mb-1">Transcription:</p>
                  <p>{transcript}</p>
                </div>
              )}
              
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type or record your answer here..."
                rows={6}
                className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isProcessingAnswer}
              />
              
              {error && (
                <div className="mt-2 text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>
            
            {evaluation ? (
              <div className="mb-6 border rounded-md p-4 bg-gray-50">
                <h3 className="text-lg font-semibold mb-3">Evaluation</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Scores</h4>
                    <ul className="space-y-1 text-sm">
                      <li className="flex justify-between">
                        <span>Relevance:</span>
                        <span className="font-medium">{evaluation.scores.relevance}/10</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Knowledge:</span>
                        <span className="font-medium">{evaluation.scores.knowledge}/10</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Clarity:</span>
                        <span className="font-medium">{evaluation.scores.clarity}/10</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Examples:</span>
                        <span className="font-medium">{evaluation.scores.examples}/10</span>
                      </li>
                      <li className="flex justify-between font-semibold">
                        <span>Overall:</span>
                        <span>{evaluation.scores.overall}/10</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Analysis</h4>
                    
                    <div className="mb-3">
                      <p className="text-xs font-medium text-green-700 mb-1">Strengths:</p>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {evaluation.analysis.strengths.map((strength, index) => (
                          <li key={index}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <p className="text-xs font-medium text-amber-700 mb-1">Areas for Improvement:</p>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {evaluation.analysis.improvements.map((improvement, index) => (
                          <li key={index}>{improvement}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="text-sm p-3 bg-indigo-50 text-indigo-800 rounded-md">
                  <p className="font-medium mb-1">Suggestion:</p>
                  <p>{evaluation.suggestion}</p>
                </div>
              </div>
            ) : (
              <div className="flex justify-center mb-6">
                <Button
                  onClick={evaluateAnswer}
                  variant="secondary"
                  isLoading={isProcessingAnswer}
                  disabled={!answer.trim() || isProcessingAnswer}
                >
                  Evaluate Answer
                </Button>
              </div>
            )}
            
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-500">
                Question {currentQuestionIndex + 1} of {questions.length}
              </div>
              <Button
                onClick={nextQuestion}
                variant="primary"
                disabled={isRecording || isProcessingAnswer}
              >
                {currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next Question'}
                <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InterviewPage() {
  return (
    <Suspense fallback={<InterviewLoading />}>
      <InterviewContent />
    </Suspense>
  );
} 