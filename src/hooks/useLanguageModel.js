// src/hooks/useLanguageModel.js

import { useState, useRef, useEffect, useCallback } from 'react';
import { formatTokenUsage } from '../utils/tokenUtils';

/**
 * A comprehensive hook for managing on-device AI model sessions with advanced features.
 * @param {object} options - Configuration for the hook.
 * @param {string} options.apiName - The name of the API (e.g., 'LanguageModel', 'Writer').
 * @param {object} [options.creationOptions={}] - Options for the API's create() method.
 */
export const useLanguageModel = ({ apiName, creationOptions = {} }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState('Idle');
  const [tokenInfo, setTokenInfo] = useState('Tokens: N/A');

  const sessionRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    const supported = apiName in self;
    setIsSupported(supported);
    if (!supported) {
      setStatus(`${apiName} API not supported.`);
    }
  }, [apiName]);

  const updateTokenUsage = useCallback(async () => {
    if (sessionRef.current && 'inputUsage' in sessionRef.current) {
      try {
        setTokenInfo(formatTokenUsage(sessionRef.current.inputUsage, sessionRef.current.inputQuota));
      } catch (error) {
        console.error("Could not update token usage:", error);
        setTokenInfo('Tokens: Error');
      }
    }
  }, []);

  const initializeSession = useCallback(async (monitor) => {
    if (!isSupported) return false;
    if (sessionRef.current) return true;

    setIsLoading(true);
    setStatus('Initializing session...');
    try {
      const session = await self[apiName].create({ ...creationOptions, ...monitor });
      if ('addEventListener' in session) {
          session.addEventListener("quotaoverflow", () => {
            setStatus("Warning: Context overflowed. Oldest messages dropped.");
            updateTokenUsage();
          });
      }
      sessionRef.current = session;
      setStatus('Session ready.');
      await updateTokenUsage();
      return true;
    } catch (error) {
      setStatus(`Session Error: ${error.message}`);
      setOutput(`Error initializing session: ${error.message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, apiName, creationOptions, updateTokenUsage]);

  const executePrompt = useCallback(async (prompt, options = {}, monitor) => {
    if (!await initializeSession(monitor)) return;

    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setIsLoading(true);
    setStatus('Generating response...');
    setOutput('');

    try {
      const session = sessionRef.current;
      // Use the appropriate method based on the API
      const executionMethod = session.promptStreaming || session.writeStreaming || session.rewriteStreaming || session.summarizeStreaming;
      
      if (!executionMethod) {
          // Fallback for APIs that don't support streaming
          const result = await (session.prompt || session.write || session.rewrite || session.summarize)(prompt, { ...options, signal });
          setOutput(result);
      } else {
          const stream = await executionMethod.call(session, prompt, { ...options, signal });
          let fullResponse = '';
          for await (const chunk of stream) {
            fullResponse += chunk;
            setOutput(fullResponse);
          }
      }
      
      setStatus('Response complete.');
      await updateTokenUsage();

    } catch (error) {
      if (error.name === 'AbortError') {
        setStatus('Prompt aborted by user.');
        setOutput('Prompt was aborted.');
      } else {
        setStatus(`Error: ${error.message}`);
        setOutput(`Error during execution: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [initializeSession, updateTokenUsage]);

  const abortCurrentPrompt = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const cloneCurrentSession = async () => {
    if (!sessionRef.current || !('clone' in sessionRef.current)) {
      setStatus('Cannot clone: No active session or API does not support it.');
      return;
    }
    setIsLoading(true);
    setStatus('Cloning session...');
    try {
      const clonedSession = await sessionRef.current.clone();
      sessionRef.current = clonedSession; // Replace current session with the clone
      setStatus('Session cloned successfully.');
      await updateTokenUsage();
    } catch (error) {
      setStatus(`Cloning failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const destroySession = () => {
    if (sessionRef.current && 'destroy' in sessionRef.current) {
      sessionRef.current.destroy();
      sessionRef.current = null;
      setStatus('Session destroyed.');
      setTokenInfo('Tokens: N/A');
      setOutput('');
    }
  };

  return {
    isSupported,
    isLoading,
    output,
    status,
    tokenInfo,
    executePrompt,
    abortCurrentPrompt,
    cloneCurrentSession,
    destroySession,
  };
};