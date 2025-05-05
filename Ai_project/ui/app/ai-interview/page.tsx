'use client';

import {
    analyzeBehavior, BehaviorAnalysis,
    CodingEvaluation,
    evaluateAnswer,
    evaluateCodingSolution,
    generateInterview,
    InterviewEvaluation,
    InterviewQuestion, transcribeAudio,
    verifyVideoFrame
} from '@/lib/api';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
    FiAlertTriangle,
    FiArrowLeft, FiArrowRight,
    FiBarChart2,
    FiCheckCircle,
    FiCode, FiEye,
    FiLoader,
    FiMic, FiMicOff,
    FiRefreshCw,
    FiVideo, FiVideoOff,
    FiX
} from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';

export default function AIInterviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const audioRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  
  // Get job ID from URL params
  const jobId = searchParams?.get('jobId');
  const jobTitle = searchParams?.get('jobTitle') || 'Job Position';
  
  // State for the interview
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  
  // State for recording and transcription
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  // State for evaluation
  const [currentEvaluation, setCurrentEvaluation] = useState<InterviewEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showEvaluation, setShowEvaluation] = useState(false);
  
  // State for video monitoring
  const [isVideoMonitoring, setIsVideoMonitoring] = useState(false);
  const [videoSessionId] = useState<string>(() => uuidv4());
  const [videoMonitoringEnabled, setVideoMonitoringEnabled] = useState(true);
  const [videoFramesCaptured, setVideoFramesCaptured] = useState(0);
  const [monitoringIntervalId, setMonitoringIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [behaviorAnalysis, setBehaviorAnalysis] = useState<BehaviorAnalysis | null>(null);
  const [showBehaviorAnalysis, setShowBehaviorAnalysis] = useState(false);
  const [isAnalyzingBehavior, setIsAnalyzingBehavior] = useState(false);
  
  // State for coding challenges
  const [currentCodingProblem, setCurrentCodingProblem] = useState<string>('');
  const [codingSolution, setCodingSolution] = useState<string>('');
  const [codingLanguage, setCodingLanguage] = useState<string>('javascript');
  const [showCodingChallenge, setShowCodingChallenge] = useState(false);
  const [codingEvaluation, setCodingEvaluation] = useState<CodingEvaluation | null>(null);
  const [isEvaluatingCode, setIsEvaluatingCode] = useState(false);
  const [showCodingEvaluation, setShowCodingEvaluation] = useState(false);
  
  // If job ID is not provided, redirect to the resume matcher page
  useEffect(() => {
    // Setup API configuration for testing
    if (typeof window !== 'undefined') {
      (window as any).API_CONFIG = {
        behaviorAnalysisUrl: 'http://localhost:3008/api/interview/analyze-behavior',
        codingEvaluationUrl: 'http://localhost:3008/api/interview/coding',
        interviewEvaluationUrl: 'http://localhost:3008/api/interview/evaluate',
        generateQuestionsUrl: 'http://localhost:3008/api/interview/generate',
        llmGenerateUrl: 'http://localhost:3008/api/llm/generate',
        transcribeUrl: 'http://localhost:3008/api/interview/transcribe'
      };
      console.log('API_CONFIG initialized for testing');
      
      // Import the local LLM module
      import('@/lib/local-llm').then(module => {
        // Initialize the local LLM
        module.initLocalLLM().then(success => {
          console.log('Local LLM initialization:', success ? 'successful' : 'failed');
        }).catch(err => {
          console.error('Error initializing local LLM:', err);
        });
      }).catch(err => {
        console.error('Error importing local LLM module:', err);
      });
    }

    if (!jobId) {
      router.push('/resume-matcher');
    } else {
      // Generate interview questions
      generateInterviewQuestions();
    }
    
    // Request microphone permissions
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          console.log('Microphone permission granted');
        })
        .catch(err => {
          console.error('Error accessing microphone:', err);
          setError('Microphone access is required for this feature. Please enable microphone access in your browser settings.');
        });
    }
    
    // Clean up when component unmounts
    return () => {
      // Stop audio recording
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (audioRecorder.current && audioRecorder.current.state === 'recording') {
        audioRecorder.current.stop();
      }
      
      // Stop video monitoring
      if (monitoringIntervalId) {
        clearInterval(monitoringIntervalId);
      }
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      }
      
      // Clean up session data
      if (videoSessionId) {
        // Could make API call to clear session data on the server
        analyzeBehavior(videoSessionId, true).catch(err => {
          console.error('Error cleaning up session data:', err);
        });
      }
    };
  }, [jobId, router, intervalId, audioRecorder, monitoringIntervalId, videoStreamRef, videoSessionId]);
  
  // Function to generate interview questions
  const generateInterviewQuestions = async () => {
    if (!jobId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await generateInterview({
        job_id: jobId,
        num_questions: 5
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setQuestions(response.questions);
      // Initialize answers with empty strings
      const initialAnswers: Record<number, string> = {};
      response.questions.forEach(q => {
        initialAnswers[q.id] = '';
      });
      setAnswers(initialAnswers);
      
    } catch (err: any) {
      console.error('Error generating interview questions:', err);
      setError(err.message || 'Failed to generate interview questions');
      
      // Fallback to mock questions
      const mockQuestions = [
        { id: 1, question: "Tell me about your experience with this technology." },
        { id: 2, question: "How would you handle a challenging deadline?" },
        { id: 3, question: "Describe a project you're proud of and your role in it." },
        { id: 4, question: "What are your greatest professional strengths?" },
        { id: 5, question: "Where do you see yourself in five years?" }
      ];
      setQuestions(mockQuestions);
      
      // Initialize answers with empty strings for mock questions
      const initialAnswers: Record<number, string> = {};
      mockQuestions.forEach(q => {
        initialAnswers[q.id] = '';
      });
      setAnswers(initialAnswers);
      
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle next/previous question
  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setShowEvaluation(false);
      setCurrentEvaluation(null);
    }
  };
  
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
      setShowEvaluation(false);
      setCurrentEvaluation(null);
    }
  };
  
  // Handle recording
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      stopRecording();
    } else {
      // Start recording
      startRecording();
    }
  };
  
  const startRecording = async () => {
    try {
      // Reset audio chunks
      audioChunks.current = [];
      
      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create media recorder
      audioRecorder.current = new MediaRecorder(stream);
      
      // Set up recorder events
      audioRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };
      
      audioRecorder.current.onstop = async () => {
        // Create audio blob
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/mp3' });
        
        // Reset recording UI state
        setIsRecording(false);
        if (intervalId) {
          clearInterval(intervalId);
          setIntervalId(null);
        }
        
        // Transcribe the recording
        await transcribeRecording(audioBlob);
      };
      
      // Start recording
      audioRecorder.current.start();
      setIsRecording(true);
      
      // Start timer
      setElapsedTime(0);
      const id = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      setIntervalId(id);
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Could not access microphone. Please check your browser settings.');
    }
  };
  
  const stopRecording = () => {
    if (audioRecorder.current && audioRecorder.current.state === 'recording') {
      audioRecorder.current.stop();
      
      // Stop all tracks in the stream
      if (audioRecorder.current.stream) {
        audioRecorder.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };
  
  const transcribeRecording = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    
    try {
      // Convert blob to base64
      const reader = new FileReader();
      
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Extract base64 data part
          const base64Content = base64data.split(',')[1];
          resolve(base64Content);
        };
        reader.onerror = reject;
      });
      
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;
      
      // Call transcribe API
      const transcribedText = await transcribeAudio(base64Audio);
      
      if (transcribedText) {
        // Update answer state
        const currentQuestion = questions[currentQuestionIndex];
        if (currentQuestion) {
          const updatedAnswer = answers[currentQuestion.id] 
            ? `${answers[currentQuestion.id]}\n\n${transcribedText}` 
            : transcribedText;
            
          setAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: updatedAnswer
          }));
        }
      }
    } catch (err) {
      console.error('Error transcribing audio:', err);
      setError('Failed to transcribe audio. Please try again or type your answer instead.');
    } finally {
      setIsTranscribing(false);
    }
  };
  
  // Format time (seconds to MM:SS)
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Handle answer change
  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;
    
    setAnswers({
      ...answers,
      [currentQuestion.id]: e.target.value
    });
  };
  
  // Get AI feedback on answer
  const evaluateCurrentAnswer = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion || !jobId) return;
    
    const answer = answers[currentQuestion.id];
    if (!answer || answer.trim() === '') {
      setError('Please provide an answer before requesting feedback.');
      return;
    }
    
    setIsEvaluating(true);
    setError(null);
    
    try {
      const evaluation = await evaluateAnswer(
        jobId,
        currentQuestion.question,
        answer
      );
      
      if (evaluation.error) {
        throw new Error(evaluation.error);
      }
      
      setCurrentEvaluation(evaluation.evaluation);
      setShowEvaluation(true);
    } catch (err: any) {
      console.error('Error evaluating answer:', err);
      setError(err.message || 'Failed to evaluate your answer. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  };
  
  // Generate new questions
  const handleRefreshQuestions = () => {
    if (window.confirm('This will generate new questions and clear your current answers. Continue?')) {
      setAnswers({});
      setCurrentQuestionIndex(0);
      setShowEvaluation(false);
      setCurrentEvaluation(null);
      generateInterviewQuestions();
    }
  };
  
  // Current question
  const currentQuestion = questions[currentQuestionIndex];
  
  // Handle video monitoring
  const toggleVideoMonitoring = async () => {
    if (isVideoMonitoring) {
      stopVideoMonitoring();
    } else {
      startVideoMonitoring();
    }
  };

  const startVideoMonitoring = async () => {
    try {
      // Start video stream if not already running
      if (!videoStreamRef.current && videoRef.current) {
        // Get media stream with video
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user' 
          } 
        });
        
        // Set stream to video element
        videoRef.current.srcObject = stream;
        videoStreamRef.current = stream;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              resolve(null);
            };
          } else {
            resolve(null);
          }
        });
        
        console.log('Video monitoring started');
      }
      
      // Start interval to capture frames and verify
      const id = setInterval(() => {
        if (videoMonitoringEnabled) {
          captureAndVerifyFrame();
        }
      }, 3000); // Verify every 3 seconds
      
      setMonitoringIntervalId(id);
      setIsVideoMonitoring(true);
      
    } catch (err) {
      console.error('Error starting video monitoring:', err);
      setError('Could not access camera. Please check your browser settings and permissions.');
    }
  };
  
  const stopVideoMonitoring = () => {
    // Clear interval
    if (monitoringIntervalId) {
      clearInterval(monitoringIntervalId);
      setMonitoringIntervalId(null);
    }
    
    // Stop video stream
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
    
    setIsVideoMonitoring(false);
  };
  
  const captureAndVerifyFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !videoStreamRef.current) {
      return;
    }
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to base64 image
      const frameBase64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
      
      // Send to API for verification
      const result = await verifyVideoFrame(frameBase64, videoSessionId);
      
      // Update frames captured count
      setVideoFramesCaptured(prev => prev + 1);
      
    } catch (err) {
      console.error('Error capturing or verifying frame:', err);
    }
  };
  
  const performBehaviorAnalysis = async () => {
    if (!videoSessionId || videoFramesCaptured === 0) {
      setError('No video data available for analysis. Please enable camera monitoring first.');
      return;
    }
    
    setIsAnalyzingBehavior(true);
    setError(null);
    
    try {
      // Call API to analyze behavior
      const result = await analyzeBehavior(videoSessionId, false);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Update state with analysis results
      setBehaviorAnalysis(result.behavior_analysis);
      setShowBehaviorAnalysis(true);
      
    } catch (err: any) {
      console.error('Error analyzing behavior:', err);
      setError(err.message || 'Failed to analyze interview behavior');
    } finally {
      setIsAnalyzingBehavior(false);
    }
  };

  // Generate coding challenge
  const generateCodingChallenge = () => {
    // Generate a coding problem based on the job skills
    // For simplicity, we're using fixed problems for demonstration
    const codingProblems = [
      {
        problem: "Write a function that finds the maximum value in an array of numbers.",
        language: "javascript",
        template: "function findMax(arr) {\n  // Your code here\n}"
      },
      {
        problem: "Create a function that counts the frequency of each character in a string and returns an object with characters as keys and counts as values.",
        language: "javascript",
        template: "function countCharacters(str) {\n  // Your code here\n}"
      },
      {
        problem: "Implement a simple stack data structure with push, pop, and peek operations.",
        language: "javascript",
        template: "class Stack {\n  constructor() {\n    // Initialize your stack\n  }\n\n  push(item) {\n    // Add item to stack\n  }\n\n  pop() {\n    // Remove and return top item\n  }\n\n  peek() {\n    // Return top item without removing\n  }\n\n  isEmpty() {\n    // Check if stack is empty\n  }\n}"
      }
    ];
    
    // Pick a random problem
    const randomProblem = codingProblems[Math.floor(Math.random() * codingProblems.length)];
    
    setCurrentCodingProblem(randomProblem.problem);
    setCodingLanguage(randomProblem.language);
    setCodingSolution(randomProblem.template);
    setShowCodingChallenge(true);
    setShowCodingEvaluation(false);
    setCodingEvaluation(null);
  };
  
  const evaluateCodingChallenge = async () => {
    if (!jobId || !currentCodingProblem || !codingSolution) {
      setError('Please complete your coding solution before submitting.');
      return;
    }
    
    setIsEvaluatingCode(true);
    setError(null);
    
    try {
      // Call API to evaluate coding solution
      const result = await evaluateCodingSolution(
        jobId,
        currentCodingProblem,
        codingSolution,
        codingLanguage
      );
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setCodingEvaluation(result.evaluation);
      setShowCodingEvaluation(true);
      
    } catch (err: any) {
      console.error('Error evaluating coding solution:', err);
      setError(err.message || 'Failed to evaluate coding solution');
    } finally {
      setIsEvaluatingCode(false);
    }
  };
  
  // Handle coding solution changes
  const handleCodingSolutionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCodingSolution(e.target.value);
  };

  // Toggle coding challenge visibility
  const toggleCodingChallenge = () => {
    if (showCodingChallenge) {
      setShowCodingChallenge(false);
    } else {
      generateCodingChallenge();
    }
  };
  
  return (
    <div className="container-custom py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">AI Interview Practice</h1>
          <p className="text-gray-600 mt-1">
            Practice your interview skills for: <span className="font-semibold">{jobTitle}</span>
          </p>
        </div>
        <Link href={jobId ? `/jobs/${jobId}` : '/resume-matcher'} className="text-primary-600 hover:text-primary-700">
          Back to job details
        </Link>
      </div>
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Generating interview questions...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiX className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={() => setError(null)}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : questions.length > 0 ? (
        <div>
          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <div className="flex space-x-3">
                <button 
                  onClick={toggleVideoMonitoring}
                  className={`text-sm text-blue-600 hover:text-blue-700 flex items-center ${isVideoMonitoring ? 'text-red-600 hover:text-red-700' : ''}`}
                  title={isVideoMonitoring ? 'Stop Video Monitoring' : 'Start Video Monitoring'}
                >
                  {isVideoMonitoring ? <FiVideoOff className="mr-1" /> : <FiVideo className="mr-1" />}
                  {isVideoMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
                </button>
                <button 
                  onClick={handleRefreshQuestions}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                >
                  <FiRefreshCw className="mr-1" /> Refresh Questions
                </button>
                <button 
                  onClick={toggleCodingChallenge}
                  className="text-sm text-purple-600 hover:text-purple-700 flex items-center"
                >
                  <FiCode className="mr-1" /> {showCodingChallenge ? 'Hide Code Challenge' : 'Show Code Challenge'}
                </button>
              </div>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-600 transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              ></div>
            </div>
          </div>
          
          {/* Video monitoring elements */}
          <div className={`${isVideoMonitoring ? 'mb-6' : 'hidden'}`}>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-md font-medium text-blue-800 flex items-center">
                  <FiEye className="mr-2" /> Video Monitoring Active
                </h3>
                <div className="flex items-center">
                  <span className="text-xs text-blue-700 mr-3">
                    {videoFramesCaptured} frames captured
                  </span>
                  <button
                    onClick={performBehaviorAnalysis}
                    disabled={videoFramesCaptured === 0 || isAnalyzingBehavior}
                    className={`text-xs py-1 px-2 rounded ${
                      videoFramesCaptured === 0 || isAnalyzingBehavior 
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isAnalyzingBehavior ? 'Analyzing...' : 'Analyze Behavior'}
                  </button>
                </div>
              </div>
              <div className="flex space-x-4">
                <div className="relative w-1/3">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-auto rounded border border-blue-300"
                  ></video>
                  <canvas ref={canvasRef} className="hidden"></canvas>
                  {/* Video status indicator */}
                  <div className="absolute top-2 right-2">
                    <div className="flex items-center bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                      <span className="h-2 w-2 bg-red-600 rounded-full animate-pulse mr-1"></span>
                      <span>LIVE</span>
                    </div>
                  </div>
                </div>
                <div className="w-2/3">
                  {showBehaviorAnalysis && behaviorAnalysis ? (
                    <div className="h-full">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Behavior Analysis</h4>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-white p-2 rounded border border-blue-200">
                          <div className="text-xs text-gray-600 mb-1">Attention Score</div>
                          <div className="flex items-center">
                            <div className="text-xl font-bold mr-1">
                              {behaviorAnalysis.attention_score}
                            </div>
                            <div className="text-xs text-gray-500">/100</div>
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded border border-blue-200">
                          <div className="text-xs text-gray-600 mb-1">Present</div>
                          <div className="flex items-center">
                            <div className="text-xl font-bold mr-1">
                              {behaviorAnalysis.present_percentage}
                            </div>
                            <div className="text-xs text-gray-500">%</div>
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded border border-blue-200">
                          <div className="text-xs text-gray-600 mb-1">Looking Away</div>
                          <div className="flex items-center">
                            <div className="text-xl font-bold mr-1">
                              {behaviorAnalysis.looking_away_percentage}
                            </div>
                            <div className="text-xs text-gray-500">%</div>
                          </div>
                        </div>
                      </div>
                      <div className={`p-2 rounded text-sm ${
                        behaviorAnalysis.suspicious_activity 
                          ? 'bg-red-100 text-red-800 border border-red-300' 
                          : 'bg-green-100 text-green-800 border border-green-300'
                      }`}>
                        <div className="flex items-center">
                          {behaviorAnalysis.suspicious_activity 
                            ? <FiAlertTriangle className="mr-1" /> 
                            : <FiCheckCircle className="mr-1" />}
                          {behaviorAnalysis.message}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col justify-center items-center h-full text-gray-600 text-sm">
                      <p>Monitoring your interview behavior to ensure integrity.</p>
                      <p className="mt-1">Click "Analyze Behavior" to check your attention score.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Coding challenge */}
          {showCodingChallenge && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-purple-800 mb-2">Coding Challenge</h3>
              <p className="text-purple-700 mb-4">{currentCodingProblem}</p>
              
              <div className="mb-4">
                <textarea
                  rows={8}
                  className="w-full bg-gray-900 text-gray-100 font-mono text-sm rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={codingSolution}
                  onChange={handleCodingSolutionChange}
                  placeholder="Write your solution here..."
                ></textarea>
              </div>
              
              <div className="flex justify-center mb-4">
                <button
                  onClick={evaluateCodingChallenge}
                  disabled={isEvaluatingCode || !codingSolution.trim()}
                  className={`flex items-center py-2 px-4 rounded transition ${
                    isEvaluatingCode || !codingSolution.trim()
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {isEvaluatingCode ? (
                    <>
                      <FiLoader className="animate-spin mr-2" /> Evaluating...
                    </>
                  ) : (
                    <>
                      <FiBarChart2 className="mr-2" /> Evaluate Code
                    </>
                  )}
                </button>
              </div>
              
              {/* Code evaluation results */}
              {showCodingEvaluation && codingEvaluation && (
                <div className="bg-white border border-purple-200 rounded-lg p-4">
                  <h4 className="text-md font-medium text-purple-800 mb-2 flex items-center">
                    <FiCheckCircle className="mr-2" /> Code Evaluation Results
                  </h4>
                  
                  {/* Score breakdown */}
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {Object.entries(codingEvaluation.scores).map(([key, score]) => (
                      <div key={key} className="flex flex-col items-center">
                        <div className="text-xs text-gray-600 mb-1 capitalize">{key}</div>
                        <div className="relative w-10 h-10">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-sm font-bold ${
                              score >= 7 ? 'text-green-700' :
                              score >= 4 ? 'text-yellow-700' :
                              'text-red-700'
                            }`}>{score}</span>
                          </div>
                          <svg className="w-full h-full" viewBox="0 0 36 36">
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#E5E7EB"
                              strokeWidth="3"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke={
                                score >= 7 ? '#10B981' :
                                score >= 4 ? '#F59E0B' :
                                '#EF4444'
                              }
                              strokeWidth="3"
                              strokeDasharray={`${score * 10}, 100`}
                            />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Strengths and improvements */}
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-purple-800 mb-1">Strengths:</h4>
                      <ul className="text-sm text-purple-700 list-disc list-inside">
                        {codingEvaluation.analysis.strengths.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-purple-800 mb-1">Areas for Improvement:</h4>
                      <ul className="text-sm text-purple-700 list-disc list-inside">
                        {codingEvaluation.analysis.improvements.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  {/* Code issues */}
                  {codingEvaluation.code_issues && codingEvaluation.code_issues.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-purple-800 mb-1">Issues Found:</h4>
                      <ul className="text-sm text-red-600 list-disc list-inside">
                        {codingEvaluation.code_issues.map((issue, index) => (
                          <li key={index}>Line {issue.line}: {issue.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Overall rating */}
                  <div className="flex items-center justify-between border-t border-purple-200 pt-3 text-purple-800">
                    <span className="font-medium">Overall Rating: <span className="font-bold">{codingEvaluation.rating}/10</span></span>
                    <div className="text-sm italic">"{codingEvaluation.suggestion}"</div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Question card */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {currentQuestion?.question || 'No question available'}
            </h2>
            
            {/* Recording controls */}
            <div className="flex items-center mb-4">
              <button
                onClick={toggleRecording}
                disabled={isTranscribing}
                className={`p-3 rounded-full mr-3 ${
                  isRecording 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                    : isTranscribing
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-green-100 text-green-600 hover:bg-green-200'
                }`}
                title={isRecording ? 'Stop Recording' : 'Start Recording'}
              >
                {isRecording ? <FiMicOff size={20} /> : <FiMic size={20} />}
              </button>
              
              <div className="text-gray-700">
                {isRecording ? (
                  <span className="flex items-center">
                    <span className="h-2 w-2 bg-red-600 rounded-full animate-pulse mr-2"></span>
                    Recording: {formatTime(elapsedTime)}
                  </span>
                ) : isTranscribing ? (
                  <span className="flex items-center">
                    <span className="h-3 w-3 mr-2">
                      <FiLoader className="animate-spin" />
                    </span>
                    Transcribing your answer...
                  </span>
                ) : (
                  'Click to start recording your answer'
                )}
              </div>
            </div>
            
            {/* Answer text area */}
            <div className="mb-6">
              <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-1">
                Your Answer:
              </label>
              <textarea
                id="answer"
                rows={6}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Type your answer here or use the microphone to record..."
                value={answers[currentQuestion?.id || 0] || ''}
                onChange={handleAnswerChange}
                disabled={isTranscribing}
              ></textarea>
            </div>

            {/* Evaluation button */}
            <div className="flex justify-center mb-6">
              <button
                onClick={evaluateCurrentAnswer}
                disabled={isEvaluating || isTranscribing || !(answers[currentQuestion?.id || 0]?.trim())}
                className={`flex items-center py-2 px-4 rounded transition ${
                  isEvaluating || isTranscribing || !(answers[currentQuestion?.id || 0]?.trim())
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isEvaluating ? (
                  <>
                    <FiLoader className="animate-spin mr-2" /> Evaluating...
                  </>
                ) : (
                  <>
                    <FiBarChart2 className="mr-2" /> Get LLM Feedback
                  </>
                )}
              </button>
            </div>
            
            {/* Evaluation results */}
            {showEvaluation && currentEvaluation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-medium text-blue-800 mb-2 flex items-center">
                  <FiCheckCircle className="mr-2" /> AI Feedback on Your Answer
                </h3>
                
                {/* Score breakdown */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {Object.entries(currentEvaluation.scores).map(([key, score]) => (
                    <div key={key} className="flex flex-col items-center">
                      <div className="text-xs text-gray-600 mb-1 capitalize">{key}</div>
                      <div className="relative w-10 h-10">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-sm font-bold ${
                            score >= 7 ? 'text-green-700' :
                            score >= 4 ? 'text-yellow-700' :
                            'text-red-700'
                          }`}>{score}</span>
                        </div>
                        <svg className="w-full h-full" viewBox="0 0 36 36">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#E5E7EB"
                            strokeWidth="3"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke={
                              score >= 7 ? '#10B981' :
                              score >= 4 ? '#F59E0B' :
                              '#EF4444'
                            }
                            strokeWidth="3"
                            strokeDasharray={`${score * 10}, 100`}
                          />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Strengths and improvements */}
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-blue-800 mb-1">Strengths:</h4>
                    <ul className="text-sm text-blue-700 list-disc list-inside">
                      {currentEvaluation.analysis.strengths.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-800 mb-1">Areas for Improvement:</h4>
                    <ul className="text-sm text-blue-700 list-disc list-inside">
                      {currentEvaluation.analysis.improvements.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                {/* Overall rating */}
                <div className="flex items-center justify-between border-t border-blue-200 pt-3 text-blue-800">
                  <span className="font-medium">Overall Rating: <span className="font-bold">{currentEvaluation.rating}/10</span></span>
                  <div className="text-sm italic">"{currentEvaluation.suggestion}"</div>
                </div>
              </div>
            )}
            
            {/* Navigation buttons */}
            <div className="flex justify-between">
              <button
                onClick={goToPreviousQuestion}
                className={`flex items-center py-2 px-4 rounded transition ${
                  currentQuestionIndex === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                disabled={currentQuestionIndex === 0}
              >
                <FiArrowLeft className="mr-2" /> Previous
              </button>
              
              <button
                onClick={goToNextQuestion}
                className={`flex items-center py-2 px-4 rounded transition ${
                  currentQuestionIndex === questions.length - 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700 text-white'
                }`}
                disabled={currentQuestionIndex === questions.length - 1}
              >
                Next <FiArrowRight className="ml-2" />
              </button>
            </div>
          </div>
          
          {/* Tips section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-800 mb-2">Interview Tips</h3>
            <ul className="list-disc list-inside text-blue-700 space-y-1">
              <li>Be concise and specific in your answers.</li>
              <li>Use the STAR method for behavioral questions (Situation, Task, Action, Result).</li>
              <li>Practice your answers out loud to improve delivery.</li>
              <li>Research the company and position before your real interview.</li>
              <li>Prepare thoughtful questions to ask the interviewer.</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">No interview questions available.</p>
          <button
            onClick={() => generateInterviewQuestions()}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md inline-flex items-center"
          >
            Generate Questions
          </button>
        </div>
      )}
    </div>
  );
} 