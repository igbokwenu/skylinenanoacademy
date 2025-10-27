// src/hooks/useLanguageModel.js
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "./useAuth";
import { cloudTextModel, isNanoSupported } from "../lib/firebase";
import { formatTokenUsage } from "../utils/tokenUtils";

/**
 * A comprehensive hook for managing HYBRID on-device and cloud AI model sessions.
 * @param {object} options - Configuration for the hook.
 * @param {string} options.apiName - The on-device API to prefer (e.g., 'LanguageModel', 'Writer').
 * @param {object} [options.creationOptions={}] - Options for the API's create() method.
 */
export const useLanguageModel = ({ apiName, creationOptions = {} }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("Idle");
  const [tokenInfo, setTokenInfo] = useState("Tokens: N/A");
  const [currentSource, setCurrentSource] = useState("Checking...");

  const { user, userInfo, incrementCallCount } = useAuth();
  const sessionRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    isNanoSupported().then((supported) => {
      setIsSupported(supported);
      if (supported) {
        setStatus("On-device AI ready.");
        setCurrentSource("On-Device AI");
      } else if (user) {
        setStatus("On-device not supported. Using Cloud AI.");
        setCurrentSource("Cloud AI");
      } else {
        setStatus("On-device AI not supported. Login to use Cloud AI.");
        setCurrentSource("Unavailable");
      }
    });
  }, [apiName, user]);

  const updateTokenUsage = useCallback(async () => {
    if (
      currentSource === "On-Device AI" &&
      sessionRef.current &&
      "inputUsage" in sessionRef.current
    ) {
      try {
        setTokenInfo(
          formatTokenUsage(
            sessionRef.current.inputUsage,
            sessionRef.current.inputQuota
          )
        );
      } catch (error) {
        console.error("Could not update token usage:", error);
        setTokenInfo("Tokens: Error");
      }
    } else if (currentSource === "Cloud AI" && userInfo) {
      setTokenInfo(
        `Cloud AI Calls: ${userInfo.firebaseAiCalls} / ${userInfo.maxFreeCalls}`
      );
    } else {
      setTokenInfo("Tokens: N/A");
    }
  }, [currentSource, userInfo]);

  const finalCreationOptions = useMemo(
    () => ({
      ...creationOptions,
      expectedOutputs: [{ type: "text", languages: ["en"] }],
    }),
    [creationOptions]
  );

  const initializeSession = useCallback(
    async (monitor) => {
      if (isSupported && !sessionRef.current) {
        setIsLoading(true);
        setStatus("Initializing on-device session...");
        try {
          const session = await self[apiName].create({
            ...finalCreationOptions,
            ...monitor,
          });
          if ("addEventListener" in session) {
            session.addEventListener("quotaoverflow", () => {
              setStatus(
                "Warning: Context overflowed. Oldest messages dropped."
              );
              updateTokenUsage();
            });
          }
          sessionRef.current = session;
          setStatus("On-device session ready.");
          await updateTokenUsage();
        } catch (error) {
          setStatus(`Session Error: ${error.message}`);
          return false;
        } finally {
          setIsLoading(false);
        }
      }
      return true; // Return true if already initialized or not needed (Cloud)
    },
    [isSupported, apiName, finalCreationOptions, updateTokenUsage]
  );

  const executePrompt = useCallback(
    async (prompt, options = {}, monitor) => {
      if (!isSupported && !user) {
        setStatus(
          "Error: On-device AI not available and not logged in for Cloud AI."
        );
        return null;
      }

      if (!(await initializeSession(monitor))) return null;

      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      setIsLoading(true);
      setStatus("Generating response...");
      setOutput("");

      try {
        let finalResult = "";
        if (isSupported) {
          // --- ON-DEVICE LOGIC ---
          setCurrentSource("On-Device AI");
          const session = sessionRef.current;
          const executionMethod =
            session.promptStreaming ||
            session.writeStreaming ||
            session.rewriteStreaming ||
            session.summarizeStreaming;
          if (executionMethod) {
            const stream = await executionMethod.call(session, prompt, {
              ...options,
              signal,
            });
            for await (const chunk of stream) {
              finalResult += chunk;
              setOutput(finalResult);
            }
          } else {
            finalResult = await (
              session.prompt ||
              session.write ||
              session.rewrite ||
              session.summarize
            )(prompt, { ...options, signal });
            setOutput(finalResult);
          }
        } else {
          // --- CLOUD AI LOGIC ---
          setCurrentSource("Cloud AI");
          if (userInfo.firebaseAiCalls >= userInfo.maxFreeCalls) {
            throw new Error(
              "You have reached your free limit for Cloud AI calls."
            );
          }

          const result = await cloudTextModel.generateContentStream(prompt, {
            signal,
          });
          await incrementCallCount(); // Increment count immediately

          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            finalResult += chunkText;
            setOutput(finalResult);
          }
        }
        setStatus("Response complete.");
        await updateTokenUsage();
        return finalResult;
      } catch (error) {
        if (error.name === "AbortError") {
          setStatus("Prompt aborted by user.");
          setOutput("Prompt was aborted.");
        } else {
          setStatus(`Error: ${error.message}`);
          setOutput(`Error during execution: ${error.message}`);
        }
        return null;
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [initializeSession, updateTokenUsage, isSupported, user, userInfo]
  );

  const abortCurrentPrompt = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const cloneCurrentSession = async () => {
    if (!sessionRef.current || !("clone" in sessionRef.current)) {
      setStatus("Cannot clone: No active session or API does not support it.");
      return;
    }
    setIsLoading(true);
    setStatus("Cloning session...");
    try {
      const clonedSession = await sessionRef.current.clone();
      sessionRef.current = clonedSession; // Replace current session with the clone
      setStatus("Session cloned successfully.");
      await updateTokenUsage();
    } catch (error) {
      setStatus(`Cloning failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const destroySession = () => {
    if (sessionRef.current && "destroy" in sessionRef.current) {
      sessionRef.current.destroy();
      sessionRef.current = null;
      setStatus("Session destroyed.");
      setTokenInfo("Tokens: N/A");
      setOutput("");
    }
  };

  return {
    isSupported,
    isLoading,
    output,
    status,
    tokenInfo,
    currentSource, // Expose which AI source is being used
    executePrompt,
    abortCurrentPrompt,
    cloneCurrentSession,
    destroySession,
  };
};
