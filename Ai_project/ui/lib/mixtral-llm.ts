/**
 * Mixtral LLM integration library
 * 
 * This library provides utilities to use the Mixtral 8x7B model
 * for various NLP tasks in the application.
 */

type LLMStatus = 'not-initialized' | 'initializing' | 'ready' | 'error';
type ProgressCallback = (current: number, total: number) => void;

interface MixtralLLM {
  status: LLMStatus;
  error?: string;
  model?: any;
  initialize: (progressCallback?: ProgressCallback) => Promise<boolean>;
  generate: (prompt: string, options?: any) => Promise<string>;
  isAvailable: () => boolean;
}

// Global instance
let mixtralInstance: MixtralLLM | null = null;

/**
 * Creates a Mixtral LLM instance
 */
const createMixtralLLM = (): MixtralLLM => {
  return {
    status: 'not-initialized',
    error: undefined,
    model: undefined,
    
    /**
     * Check if the Mixtral model is available
     */
    isAvailable() {
      return this.status === 'ready' && !!this.model;
    },
    
    /**
     * Initialize the Mixtral model
     */
    async initialize(progressCallback?: ProgressCallback): Promise<boolean> {
      // Don't initialize if already initializing or ready
      if (this.status === 'initializing' || this.status === 'ready') {
        return this.status === 'ready';
      }
      
      // Update status
      this.status = 'initializing';
      this.error = undefined;
      
      try {
        // Check if the WebLLM library is available globally
        if (typeof window === 'undefined') {
          throw new Error('Cannot initialize LLM in server-side context');
        }
        
        // Try to load the WebLLM library
        if (!(window as any).webllm) {
          // Load the wrapper script
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/lib/web-llm/webllm-wrapper.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load WebLLM wrapper'));
            document.head.appendChild(script);
          });
          
          // Wait for the script to initialize
          await new Promise<void>((resolve) => {
            const checkInterval = setInterval(() => {
              if ((window as any).webllm) {
                clearInterval(checkInterval);
                resolve();
              }
            }, 100);
            
            // Timeout after 5 seconds
            setTimeout(() => {
              clearInterval(checkInterval);
              if (!(window as any).webllm) {
                this.status = 'error';
                this.error = 'WebLLM library failed to initialize within timeout';
              }
              resolve();
            }, 5000);
          });
        }
        
        // Check if WebLLM is available
        if (!(window as any).webllm || !(window as any).webllm.WebLLM) {
          throw new Error('WebLLM library not available');
        }
        
        // Create WebLLM instance
        this.model = new (window as any).webllm.WebLLM();
        
        // Set progress callback if provided
        if (progressCallback) {
          this.model.setProgressCallback(progressCallback);
        }
        
        // Initialize the model
        await this.model.reload({
          model: 'Mixtral-8x7B-Instruct-v0.1-q4f16_1',
          modelUrl: 'https://huggingface.co/mlc-ai/Mixtral-8x7B-Instruct-v0.1-q4f16_1/resolve/main/',
          maxTokens: 2048
        });
        
        // Update status to ready
        this.status = 'ready';
        return true;
        
      } catch (error) {
        // Handle errors
        this.status = 'error';
        this.error = error instanceof Error ? error.message : String(error);
        console.error('Mixtral initialization error:', error);
        return false;
      }
    },
    
    /**
     * Generate text using the Mixtral model
     */
    async generate(prompt: string, options: any = {}): Promise<string> {
      // Check if the model is initialized
      if (!this.isAvailable()) {
        throw new Error('Mixtral model not initialized. Call initialize() first.');
      }
      
      try {
        // Generate text using the model
        const result = await this.model.generate(prompt, {
          max_gen_len: options.maxTokens || 512,
          temperature: options.temperature || 0.7,
          top_p: options.topP || 0.95
        });
        
        // Return the generated text
        return result.output || '';
        
      } catch (error) {
        console.error('Mixtral generation error:', error);
        throw error;
      }
    }
  };
};

/**
 * Get the Mixtral LLM instance (singleton)
 */
export const getMixtralLLM = (): MixtralLLM => {
  if (!mixtralInstance) {
    mixtralInstance = createMixtralLLM();
  }
  return mixtralInstance;
};

/**
 * Initialize the Mixtral model
 */
export const initMixtralLLM = async (progressCallback?: ProgressCallback): Promise<boolean> => {
  const llm = getMixtralLLM();
  return await llm.initialize(progressCallback);
};

/**
 * Generate text using the Mixtral model
 */
export const generateWithMixtral = async (prompt: string, options: any = {}): Promise<string> => {
  const llm = getMixtralLLM();
  return await llm.generate(prompt, options);
};

/**
 * Check if the Mixtral model is available
 */
export const isMixtralAvailable = (): boolean => {
  const llm = getMixtralLLM();
  return llm.isAvailable();
};

/**
 * Get the current status of the Mixtral model
 */
export const getMixtralStatus = (): LLMStatus => {
  const llm = getMixtralLLM();
  return llm.status;
}; 