import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function LLMTestRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/debug/local-llm-test');
  }, [router]);
  
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '1rem' }}>Redirecting to Local LLM Test...</h1>
      <p>If you are not redirected automatically, please click the link below:</p>
      <div style={{ marginTop: '1rem' }}>
        <a 
          href="/debug/local-llm-test" 
          style={{ 
            display: 'inline-block', 
            padding: '0.5rem 1rem', 
            backgroundColor: '#4F46E5', 
            color: 'white', 
            textDecoration: 'none',
            borderRadius: '4px',
            fontWeight: '500'
          }}
        >
          Go to Local LLM Test
        </a>
      </div>
    </div>
  );
} 