// src/hooks/useLanguageModel.js
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "./useAuth";
import {
  cloudTextModel,
  isNanoSupported,
  fileToGenerativePart,
} from "../lib/firebase";
import { formatTokenUsage } from "../utils/tokenUtils";

const isLikelyJson = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

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
        setStatus("On-device not supported. Using Firebase AI (Cloud).");
        setCurrentSource("Cloud AI");
      } else {
        setStatus(
          "On-device AI not supported. Login to use Firebase AI (Cloud)."
        );
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
      return true;
    },
    [isSupported, apiName, finalCreationOptions, updateTokenUsage]
  );

  const executePrompt = useCallback(
    async (prompt, options = {}, monitor) => {
      const nanoSupported = await isNanoSupported();
      if (!nanoSupported && !user) {
        setStatus(
          "Error: On-device AI not available. Please login to use Firebase AI (Cloud)."
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

        if (nanoSupported) {
          // --- ON-DEVICE LOGIC (Unchanged) ---
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
          // --- CLOUD AI LOGIC (COMPLETELY REBUILT) ---
          setCurrentSource("Cloud AI");
          if (userInfo.firebaseAiCalls >= userInfo.maxFreeCalls) {
            throw new Error(
              "You have reached your free limit for Cloud AI calls."
            );
          }

          // FIX: This block now robustly translates any prompt format into the
          //      format required by the cloud GenerativeModel SDK.
          let finalParts = [];
          const generationConfig = {};

          if (typeof prompt === "string") {
            // Case 1: The prompt is a simple string.
            finalParts.push({ text: prompt });
          } else if (Array.isArray(prompt)) {
            // Case 2: The prompt is a complex array (for multimodal input).
            // The on-device format is: [{ role: 'user', content: [ {type:'text', value:'...'}, {type:'image', value:File} ] }]
            const content = prompt[0]?.content;
            if (Array.isArray(content)) {
              // This must be async to handle file conversions.
              finalParts = await Promise.all(
                content.map(async (part) => {
                  if (part.type === "text") {
                    return { text: part.value };
                  }
                  // THIS IS THE FIX for the 'required oneof field data' error.
                  // It now correctly converts the File object to a Part object.
                  if (part.type === "image" && part.value) {
                    return await fileToGenerativePart(part.value);
                  }
                  // Fallback for any other type, like audio
                  if (
                    (part.type === "audio" || part.type === "video") &&
                    part.value
                  ) {
                    return await fileToGenerativePart(new Blob([part.value]));
                  }
                  return {}; // Return empty object for invalid parts
                })
              );
            }
          }

          // Handle schema constraints for JSON mode
          if (options.responseConstraint) {
            generationConfig.responseMimeType = "application/json";
            generationConfig.responseSchema = options.responseConstraint; // Add schema to config

            if (!options.omitResponseConstraintInput) {
              const schemaInstruction = `\nYou MUST respond in a valid JSON object matching this schema: ${JSON.stringify(
                options.responseConstraint
              )}. Do not wrap the JSON in markdown backticks.`;
              const textPart = finalParts.find((p) => "text" in p);
              if (textPart) {
                textPart.text += schemaInstruction;
              } else {
                finalParts.push({ text: schemaInstruction });
              }
            }
          }

          const result = await cloudTextModel.generateContentStream(
            {
              contents: [{ role: "user", parts: finalParts }],
              generationConfig,
            },
            { signal }
          );

          await incrementCallCount();

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
        } else {
          setStatus(`Error: ${error.message}`);
          console.error("Execution Error:", error);
        }
        return null;
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [initializeSession, updateTokenUsage, user, userInfo]
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
