import { useRouteError, isRouteErrorResponse } from 'react-router-dom';

export function ErrorBoundary() {
  const error = useRouteError();
  
  let errorMessage = 'An unexpected error occurred';
  let errorStack: string | undefined;
  let errorDetails: Record<string, unknown> = {};
  
  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText || error.data?.message || errorMessage;
    if (error.data instanceof Error) {
      errorStack = error.data.stack;
      errorMessage = error.data.message || errorMessage;
      errorDetails = {
        name: error.data.name,
        cause: error.data.cause,
      };
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
    errorStack = error.stack;
    errorDetails = {
      name: error.name,
      cause: error.cause,
    };
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else {
    try {
      errorMessage = JSON.stringify(error);
    } catch {
      errorMessage = String(error);
    }
  }
  
  console.error('Error Boundary caught error:', {
    error,
    message: errorMessage,
    stack: errorStack,
    details: errorDetails,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
  });
  
  const isModuleImportError = errorMessage.includes('Failed to fetch dynamically imported module') ||
                              errorMessage.includes('Failed to fetch') ||
                              (error instanceof Error && error.message.includes('Failed to fetch'));
  
  return (
    <div style={{
      minHeight: '100vh',
      background: '#101014',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        maxWidth: '800px',
        width: '100%',
        background: '#1a1a1e',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '2rem',
      }}>
        <h1 style={{ 
          fontSize: '1.5rem', 
          fontWeight: 'bold', 
          marginBottom: '1rem',
          color: '#ff4444',
        }}>
          Unexpected Application Error!
        </h1>
        
        <div style={{
          background: '#0a0a0e',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem',
          fontSize: '0.9rem',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          <div style={{ color: '#ff8888', marginBottom: '0.5rem' }}>
            {errorMessage}
          </div>
          
          {errorStack && (
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ 
                cursor: 'pointer', 
                color: '#888',
                marginBottom: '0.5rem',
              }}>
                Stack Trace (click to expand)
              </summary>
              <pre style={{
                margin: '0.5rem 0',
                padding: '0.5rem',
                background: '#000',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '300px',
                fontSize: '0.8rem',
                color: '#ccc',
              }}>
                {errorStack}
              </pre>
            </details>
          )}
          
          {isModuleImportError && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: '#2a2a1e',
              borderLeft: '3px solid #ffaa00',
              borderRadius: '4px',
            }}>
              <strong style={{ color: '#ffaa00' }}>Module Import Error Detected</strong>
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#ccc' }}>
                This appears to be a dynamic module import failure. This can happen after a deployment when the service worker cache is out of sync. Try refreshing the page or clearing your browser cache.
              </div>
            </div>
          )}
        </div>
        
        {errorDetails && Object.keys(errorDetails).length > 0 && (
          <details style={{ marginTop: '1rem' }}>
            <summary style={{ 
              cursor: 'pointer', 
              color: '#888',
              marginBottom: '0.5rem',
            }}>
              Additional Error Details
            </summary>
            <pre style={{
              margin: '0.5rem 0',
              padding: '0.5rem',
              background: '#0a0a0e',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '0.8rem',
              color: '#ccc',
            }}>
              {JSON.stringify(errorDetails, null, 2)}
            </pre>
          </details>
        )}
        
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: '#1a2a1a',
          borderLeft: '3px solid #4a9',
          borderRadius: '4px',
        }}>
          <strong style={{ color: '#4a9' }}>Developer Information</strong>
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#aaa' }}>
            Full error details including stack trace have been logged to the browser console. 
            Check the console for complete debugging information.
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#aaa' }}>
            URL: {window.location.href}
          </div>
          <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#aaa' }}>
            Time: {new Date().toISOString()}
          </div>
        </div>
        
        <div style={{ marginTop: '1.5rem' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#4a9',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#5ba'}
            onMouseOut={(e) => e.currentTarget.style.background = '#4a9'}
            onFocus={(e) => e.currentTarget.style.background = '#5ba'}
            onBlur={(e) => e.currentTarget.style.background = '#4a9'}
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}

