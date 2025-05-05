'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  initMixtralLLM, 
  isMixtralAvailable, 
  getMixtralStatus,
  generateWithMixtral
} from '@/lib/mixtral-llm';

export default function MixtralTestPage() {
  // Mixtral state
  const [status, setStatus] = useState<string>('not-initialized');
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Generation state
  const [prompt, setPrompt] = useState<string>('Generate a job interview question for a senior React developer position that tests their knowledge of TypeScript and state management.');
  const [response, setResponse] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  // Options state
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(512);

  // Check Mixtral status on page load
  useEffect(() => {
    checkStatus();
  }, []);
  
  // Update status from library
  const checkStatus = () => {
    const available = isMixtralAvailable();
    setStatus(getMixtralStatus());
    if (error && available) {
      setError(null);
    }
  };
  
  // Initialize Mixtral
  const handleInitialize = async () => {
    setIsInitializing(true);
    setError(null);
    
    try {
      const success = await initMixtralLLM((current, total) => {
        setProgress({ current, total });
      });
      
      if (!success) {
        setError('Failed to initialize Mixtral model');
      }
    } catch (err) {
      setError(`Error initializing Mixtral: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsInitializing(false);
      checkStatus();
    }
  };
  
  // Generate text with Mixtral
  const handleGenerate = async () => {
    if (!isMixtralAvailable()) {
      setGenerationError('Mixtral model not initialized. Please initialize first.');
      return;
    }
    
    if (!prompt.trim()) {
      setGenerationError('Please enter a prompt.');
      return;
    }
    
    setIsGenerating(true);
    setGenerationError(null);
    setResponse('');
    
    try {
      const result = await generateWithMixtral(prompt, {
        temperature,
        maxTokens
      });
      
      setResponse(result);
    } catch (err) {
      setGenerationError(`Error generating response: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Clear the response
  const handleClear = () => {
    setResponse('');
    setGenerationError(null);
  };
  
  return (
    <div className="container mx-auto p-4 max-w-4xl">
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
      
      <h1 className="text-3xl font-bold mb-6">Mixtral 8x7B Test</h1>
      
      {/* Model Status Card */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3">Model Status</h2>
        
        <div className="flex items-center mb-4">
          <div className={`w-3 h-3 rounded-full mr-2 ${
            status === 'ready' ? 'bg-green-500' : 
            status === 'initializing' ? 'bg-yellow-500' :
            status === 'error' ? 'bg-red-500' : 'bg-gray-500'
          }`}></div>
          <span className="font-medium">
            {status === 'ready' ? 'Ready' : 
             status === 'initializing' ? 'Initializing' :
             status === 'error' ? 'Error' : 'Not Initialized'}
          </span>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}
        
        {progress && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Loading: {progress.current}/{progress.total} ({Math.round((progress.current / progress.total) * 100)}%)
            </p>
          </div>
        )}
        
        <button
          onClick={handleInitialize}
          disabled={isInitializing || status === 'initializing' || status === 'ready'}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isInitializing ? 'Initializing...' : status === 'ready' ? 'Already Initialized' : 'Initialize Mixtral'}
        </button>
      </div>
      
      {/* Generation Card */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-3">Generate with Mixtral</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your prompt here..."
          ></textarea>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temperature: {temperature}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Tokens: {maxTokens}
            </label>
            <input
              type="range"
              min="64"
              max="2048"
              step="64"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
        
        <div className="flex space-x-2 mb-4">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || status !== 'ready'}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
          
          <button
            onClick={handleClear}
            disabled={isGenerating || !response}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>
        
        {generationError && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">
            {generationError}
          </div>
        )}
        
        {response && (
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h3 className="text-lg font-medium mb-2">Response:</h3>
            <div className="whitespace-pre-wrap">{response}</div>
          </div>
        )}
      </div>
    </div>
  );
} 