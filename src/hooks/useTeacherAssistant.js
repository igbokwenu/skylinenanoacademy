// src/hooks/useTeacherAssistant.js
import { useState, useRef, useCallback, useEffect } from "react";
import { useLanguageModel } from "./useLanguageModel";
import { db } from "../lib/db";
import { doc, updateDoc, increment } from "firebase/firestore"; // For updating call count
import { auth } from "../lib/firebase"; // For getting current user
import {
  isNanoSupported,
  cloudTextModel,
  fileToGenerativePart,
} from "../lib/firebase";
import { useAuth } from "./useAuth.jsx";

// --- CONFIGURATION ---
const MAX_CLOUD_AUDIO_MB = 100;
const CHUNK_SECONDS = 29;
const MAX_TRANSCRIPTION_DURATION_HOURS = 12;

// --- AUDIO UTILITIES (Unchanged) ---
function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
function encodeWavPCM16(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels,
    sampleRate = audioBuffer.sampleRate,
    frames = audioBuffer.length;
  const interleaved = new Int16Array(frames * numChannels);
  const channelData = Array.from({ length: numChannels }, (_, ch) =>
    audioBuffer.getChannelData(ch)
  );
  let w = 0;
  for (let i = 0; i < frames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let s = Math.max(-1, Math.min(1, channelData[ch][i]));
      interleaved[w++] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
  }
  const bytesPerSample = 2,
    blockAlign = numChannels * bytesPerSample,
    byteRate = sampleRate * blockAlign,
    dataSize = interleaved.byteLength,
    headerSize = 44;
  const buf = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buf);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);
  new Int16Array(buf, headerSize).set(interleaved);
  return buf;
}

// --- TOKEN ESTIMATION ---
const estimateTokens = (text) => Math.ceil(text.length / 4);
const ON_DEVICE_TOKEN_LIMIT = 5800;

export const useTeacherAssistant = () => {
  const { user, incrementCallCount } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready to start.");
  const [transcription, setTranscription] = useState("");
  const [lessonTitle, setLessonTitle] = useState(
    `Lesson ${new Date().toLocaleDateString()}`
  );
  const [summary, setSummary] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [condensedLesson, setCondensedLesson] = useState("");
  const [homework, setHomework] = useState("");
  const [quiz, setQuiz] = useState("");
  const [lessonCreatorPrompt, setLessonCreatorPrompt] = useState("");
  const [ageRange, setAgeRange] = useState("Undergraduate (Ages 18-22)");
  const [savedLessonId, setSavedLessonId] = useState(null);

  // --- NEW STATE for Hybrid Processing ---
  const [isPartiallyProcessed, setIsPartiallyProcessed] = useState(false);
  const [fullTranscriptForReprocessing, setFullTranscriptForReprocessing] =
    useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const languageModelSessionRef = useRef(null);
  const recordingTimeoutRef = useRef(null);

  const { executePrompt: executeSummarize } = useLanguageModel({
    apiName: "Summarizer",
  });
  const { executePrompt: executeRewrite } = useLanguageModel({
    apiName: "Rewriter",
  });
  const { executePrompt: executeWrite } = useLanguageModel({
    apiName: "Writer",
  });

  const getContextualPrompt = (basePrompt, transcript) => {
    return `${basePrompt}\n\nTailor the language, complexity, and examples to be appropriate for the following age group: ${ageRange}.\n\nTranscript:\n${transcript}`;
  };

  const transcribeAudioChunk = useCallback(
    async (blob) => {
      const nanoSupported = await isNanoSupported();

      if (nanoSupported) {
        // --- ON-DEVICE LOGIC (Original) ---
        try {
          if (!languageModelSessionRef.current) {
            languageModelSessionRef.current = await self.LanguageModel.create({
              expectedInputs: [{ type: "audio" }],
            });
          }
          const arrayBuffer = await blob.arrayBuffer();
          const result = await languageModelSessionRef.current.prompt([
            {
              role: "user",
              content: [
                { type: "text", value: "Transcribe this audio accurately." },
                { type: "audio", value: arrayBuffer },
              ],
            },
          ]);
          return result;
        } catch (error) {
          console.error("On-device transcription chunk failed:", error);
          return "[TRANSCRIPTION ERROR]";
        }
      } else {
        // --- CLOUD AI FALLBACK LOGIC (NEW) ---
        if (!user) {
          setStatusMessage(
            "Login is required for transcription on this browser."
          );
          return "[LOGIN REQUIRED]";
        }
        try {
          const audioPart = await fileToGenerativePart(blob);
          const prompt =
            "Transcribe this audio accurately. If there is no speech, return an empty string.";

          const result = await cloudTextModel.generateContent([
            prompt,
            audioPart,
          ]);
          await incrementCallCount(); // Meter the API call

          return result.response.text();
        } catch (error) {
          console.error("Cloud transcription chunk failed:", error);
          setStatusMessage(`Cloud transcription error: ${error.message}`);
          return "[TRANSCRIPTION ERROR]";
        }
      }
    },
    [user, incrementCallCount]
  );

  // --- NEW: Microphone Test Transcription Function ---
  const transcribeTestAudio = useCallback(
    async (blob) => {
      if (!blob || blob.size === 0) return "No audio recorded.";
      return await transcribeAudioChunk(blob);
    },
    [transcribeAudioChunk]
  );

  const runInitialAnalysis = useCallback(
    async (fullTranscript) => {
      if (!fullTranscript) return;
      setIsPartiallyProcessed(false);
      setFullTranscriptForReprocessing("");

      let transcriptForProcessing = fullTranscript;
      const totalTokens = estimateTokens(fullTranscript);

      if (totalTokens > ON_DEVICE_TOKEN_LIMIT) {
        setIsPartiallyProcessed(true);
        setFullTranscriptForReprocessing(fullTranscript);
        // Find a good place to slice without cutting a word
        let sliceEnd = ON_DEVICE_TOKEN_LIMIT * 4;
        while (
          sliceEnd < fullTranscript.length &&
          fullTranscript[sliceEnd] !== " "
        ) {
          sliceEnd++;
        }
        transcriptForProcessing = fullTranscript.substring(0, sliceEnd);
        const processedPercentage = Math.round(
          (transcriptForProcessing.length / fullTranscript.length) * 100
        );
        setStatusMessage(
          `On-device processing limit reached. Processing first ${processedPercentage}% of the transcript.`
        );
      }

      try {
        setStatusMessage("Generating lesson title...");
        const titleBasePrompt =
          "You are a creative editor. Based on the following lesson content, write one single, compelling, and concise title. The title must be a single sentence and should not exceed 15 words. Your response must ONLY contain the title text, with no asterisks, quotes, or bullet points.";
        const contextualTitlePrompt = getContextualPrompt(
          titleBasePrompt,
          transcriptForProcessing
        );
        const titleResult = await executeWrite(contextualTitlePrompt);
        if (titleResult) {
          const cleanedTitle = titleResult.replace(/[*#"\.]/g, "").trim();
          setLessonTitle(cleanedTitle);
        }

        setStatusMessage("Generating summary...");
        const summaryResult = await executeSummarize(transcriptForProcessing, {
          type: "tldr",
          length: "long",
        });
        setSummary(summaryResult);

        setStatusMessage("Extracting key points...");
        const pointsResult = await executeSummarize(transcriptForProcessing, {
          type: "key-points",
          length: "long",
        });
        setKeyPoints(pointsResult);

        setStatusMessage("Condensing lesson...");
        const condensedResult = await executeRewrite(transcriptForProcessing, {
          length: "shorter",
        });
        setCondensedLesson(condensedResult);

        if (isPartiallyProcessed) {
          setStatusMessage(
            "Initial analysis complete on partial transcript. Use Cloud AI to process the full text."
          );
        } else {
          setStatusMessage(
            "Initial analysis complete. You can now generate follow-up materials."
          );
        }
      } catch (error) {
        console.error("Initial analysis failed:", error);
        setStatusMessage(`Error during auto-analysis: ${error.message}`);
      }
    },
    [
      executeSummarize,
      executeRewrite,
      executeWrite,
      getContextualPrompt,
      isPartiallyProcessed,
    ]
  );

  const processAudio = useCallback(
    async (blob) => {
      resetStateForNewJob();
      setIsProcessing(true);
      const nanoSupported = await isNanoSupported();

      if (nanoSupported) {
        // --- ON-DEVICE CHUNKING LOGIC ---
        setStatusMessage("Step 1/3: Decoding audio...");
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const ac = new (window.AudioContext || window.webkitAudioContext)();
          const audioBuffer = await ac.decodeAudioData(arrayBuffer);
          const { sampleRate, numberOfChannels, duration } = audioBuffer;

          if (duration > MAX_TRANSCRIPTION_DURATION_HOURS * 3600) {
            // This check is now also handled by the recording timeout
            setStatusMessage(
              `Audio exceeds the maximum limit of ${MAX_TRANSCRIPTION_DURATION_HOURS} hours.`
            );
            setIsProcessing(false);
            return;
          }

          const totalChunks = Math.max(1, Math.ceil(duration / CHUNK_SECONDS));
          setStatusMessage(`Step 2/3: Slicing into ${totalChunks} chunk(s)...`);
          const chunksToProcess = [];
          for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SECONDS;
            const end = Math.min((i + 1) * CHUNK_SECONDS, duration);
            const chunkDuration = end - start;
            const chunkStartFrame = Math.floor(start * sampleRate);
            const framesInChunk = Math.floor(chunkDuration * sampleRate);
            const chunkBuffer = ac.createBuffer(
              numberOfChannels,
              framesInChunk,
              sampleRate
            );
            for (let ch = 0; ch < numberOfChannels; ch++) {
              const sourceData = audioBuffer.getChannelData(ch);
              const chunkData = sourceData.subarray(
                chunkStartFrame,
                chunkStartFrame + framesInChunk
              );
              chunkBuffer.copyToChannel(chunkData, ch, 0);
            }
            const wavBuffer = encodeWavPCM16(chunkBuffer);
            chunksToProcess.push(new Blob([wavBuffer], { type: "audio/wav" }));
          }
          let fullTranscript = "";
          for (const [index, chunk] of chunksToProcess.entries()) {
            setStatusMessage(
              `Step 3/3: Transcribing chunk ${index + 1} of ${totalChunks}...`
            );
            const transcriptPart = await transcribeAudioChunk(chunk);
            if (transcriptPart === "[LOGIN REQUIRED]") {
              // Early exit if login is required but user is not logged in
              fullTranscript = transcriptPart;
              break;
            }
            fullTranscript += ` ${transcriptPart}`;
            setTranscription(fullTranscript.trim());
          }
          if (fullTranscript !== "[LOGIN REQUIRED]") {
            await runInitialAnalysis(fullTranscript.trim());
          }
        } catch (error) {
          console.error("Audio processing failed:", error);
          setStatusMessage(`Error during processing: ${error.message}`);
        } finally {
          setIsProcessing(false);
        }
      } else {
        // --- CLOUD AI SINGLE FILE LOGIC ---
        if (!user) {
          setStatusMessage(
            "Please login to use transcription on this browser."
          );
          setIsProcessing(false);
          return;
        }
        if (blob.size > MAX_CLOUD_AUDIO_MB * 1024 * 1024) {
          setStatusMessage(
            `File is too large. The limit for cloud transcription is ${MAX_CLOUD_AUDIO_MB}MB.`
          );
          setIsProcessing(false);
          return;
        }

        setStatusMessage("Uploading and transcribing with Cloud AI...");
        try {
          const audioPart = await fileToGenerativePart(blob);
          const prompt = "Transcribe this audio accurately and thoroughly.";
          const result = await cloudTextModel.generateContent([
            prompt,
            audioPart,
          ]);
          await incrementCallCount();
          const fullTranscript = result.response.text();
          setTranscription(fullTranscript);
          await runInitialAnalysis(fullTranscript);
        } catch (error) {
          console.error("Cloud transcription failed:", error);
          setStatusMessage(
            `Error during cloud transcription: ${error.message}. Please check your network connection and try again.`
          );
        } finally {
          setIsProcessing(false);
        }
      }
    },
    [user, transcribeAudioChunk, runInitialAnalysis, incrementCallCount]
  );
  const resetStateForNewJob = () => {
    setTranscription("");
    setSummary("");
    setKeyPoints("");
    setCondensedLesson("");
    setHomework("");
    setQuiz("");
    setLessonCreatorPrompt("");
    setSavedLessonId(null);
    setIsPartiallyProcessed(false);
    setFullTranscriptForReprocessing("");
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      resetStateForNewJob();
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // This logic is now the same for manual stop or timeout
        stream.getTracks().forEach((track) => track.stop());
        if (recordingTimeoutRef.current) {
          clearTimeout(recordingTimeoutRef.current);
        }

        const finalBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        if (finalBlob.size > 0) {
          processAudio(finalBlob);
        } else {
          setStatusMessage("No audio was recorded.");
          setIsProcessing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
      setStatusMessage('Recording... Click "End Lesson" to stop and process.');

      // Set a timeout to automatically stop the recording after 12 hours
      recordingTimeoutRef.current = setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === "recording"
        ) {
          setStatusMessage(
            "Maximum recording limit reached. Processing audio..."
          );
          stopRecording();
        }
      }, MAX_TRANSCRIPTION_DURATION_HOURS * 3600 * 1000);
    } catch (err) {
      setStatusMessage("Microphone access denied. Please check permissions.");
      console.error(err);
    }
  }, [processAudio]); // Corrected and simplified dependency array

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop(); // This will trigger the onstop handler
      setIsRecording(false);
    }
  }, []);
  // --- NEW: Cloud Reprocessing Functions ---
  const reprocessWithFirebase = async (type) => {
    if (!fullTranscriptForReprocessing || !auth.currentUser) {
      setStatusMessage("Error: No transcript or user not logged in.");
      return;
    }
    setIsProcessing(true);

    const userDocRef = doc(db, "users", auth.currentUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (
      userDoc.exists() &&
      userDoc.data().firebaseAiCalls >= userDoc.data().maxFreeCalls
    ) {
      setStatusMessage(
        "Error: You have exceeded your free Cloud AI calls limit."
      );
      setIsProcessing(false);
      return;
    }

    let prompt = "";
    let resultParser;

    if (type === "analysis") {
      setStatusMessage("Reprocessing with Cloud AI for full analysis...");
      prompt = `Analyze the following transcript from a lesson. Respond with a JSON object containing three keys: "summary", "keyPoints", and "condensedLesson".\n\nTranscript:\n${fullTranscriptForReprocessing}`;
      resultParser = (json) => {
        setSummary(json.summary);
        setKeyPoints(json.keyPoints);
        setCondensedLesson(json.condensedLesson);
      };
    } else if (type === "followUp") {
      setStatusMessage("Generating follow-up materials with Cloud AI...");
      prompt = `Based on the following lesson transcript, generate a JSON object with three keys: "homework", "quiz", and "lessonCreatorPrompt".\n- For "homework", create 5 questions with a detailed answer key separated by '---ANSWERS---'.\n- For "quiz", create a 5-question multiple-choice quiz (4 options each) with an answer key separated by '---ANSWERS---'.\n- For "lessonCreatorPrompt", write a detailed prompt for a lesson-generating AI to create a story-driven lesson based on the transcript.\n\nTranscript:\n${fullTranscriptForReprocessing}`;
      resultParser = (json) => {
        setHomework(json.homework);
        setQuiz(json.quiz);
        setLessonCreatorPrompt(json.lessonCreatorPrompt);
      };
    }

    try {
      const result = await cloudTextModel.generateContent({
        contents: [
          {
            parts: [
              {
                text: getContextualPrompt(
                  prompt,
                  fullTranscriptForReprocessing
                ),
              },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json" },
      });
      const responseText = result.response.text();
      const parsedJson = JSON.parse(responseText);
      resultParser(parsedJson);

      // Increment user's call count
      await updateDoc(userDocRef, { firebaseAiCalls: increment(1) });

      setStatusMessage("Cloud AI processing complete!");
    } catch (error) {
      console.error("Firebase AI re-processing failed:", error);
      setStatusMessage(`Error during cloud processing: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = useCallback(
    (file) => {
      if (file) processAudio(file);
    },
    [processAudio]
  );

  // analyzeText can now handle both on-device and cloud
  const analyzeText = async (type) => {
    if ((!transcription && !fullTranscriptForReprocessing) || isProcessing)
      return;

    // If it was partially processed, use the cloud for follow-up materials
    if (isPartiallyProcessed) {
      await reprocessWithFirebase("followUp");
      return;
    }

    setIsProcessing(true);
    try {
      let basePrompt = "";
      let resultSetter;
      switch (type) {
        case "homework":
          basePrompt =
            "You are a teacher creating a homework assignment based on a lesson you just taught. The content of the lesson is provided below. Create 5 homework questions. After all the questions are listed, you MUST include a separator line that contains only the text '---ANSWERS---'. After the separator, provide a detailed answer key.";
          resultSetter = setHomework;
          break;
        case "quiz":
          basePrompt =
            "You are a teacher creating a quiz based on a lesson you just taught. The content of the lesson is provided below. Create a 5-question multiple-choice quiz with 4 options each. After all the questions and their options are listed, you MUST include a separator line that contains only the text '---ANSWERS---'. After the separator, provide the answer key, clearly indicating the correct letter for each question.";
          resultSetter = setQuiz;
          break;
        case "lessonPrompt":
          basePrompt =
            "Analyze the lesson content provided below. Based on this analysis, create a detailed and compelling prompt for a lesson-generating AI. The new prompt should instruct the AI to create an engaging, story-driven lesson (like a comic book or storybook) that covers the core topics and concepts from the original lesson. Do not mention the word 'transcript'.";
          resultSetter = setLessonCreatorPrompt;
          break;
        default:
          setStatusMessage("Unknown analysis type.");
          setIsProcessing(false);
          return;
      }
      setStatusMessage(`Creating ${type}...`);
      const contextualPrompt = getContextualPrompt(basePrompt, transcription);
      const result = await executeWrite(contextualPrompt, { length: "long" });
      resultSetter(result);
      setStatusMessage("Follow-up material generated.");
    } catch (error) {
      setStatusMessage(`Error during analysis: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveLesson = useCallback(async () => {
    if (!transcription || isProcessing) return;
    setIsProcessing(true);
    setStatusMessage("Saving lesson to database...");
    try {
      const lessonData = {
        createdAt: new Date(),
        title: lessonTitle,
        transcription,
        summary,
        keyPoints,
        condensedLesson,
        homework,
        quiz,
        lessonCreatorPrompt,
      };
      // If it was already saved, update it. Otherwise, add new.
      const idToSave = savedLessonId
        ? await db.teacherAssistantLessons.put(lessonData, savedLessonId)
        : await db.teacherAssistantLessons.add(lessonData);
      setSavedLessonId(idToSave); // Keep track of the saved ID
      setStatusMessage(`Lesson saved successfully! (ID: ${idToSave})`);
      return idToSave; // Return ID for other functions to use
    } catch (error) {
      setStatusMessage(`Failed to save lesson: ${error.message}`);
      console.error("Save error:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    lessonTitle,
    transcription,
    summary,
    keyPoints,
    condensedLesson,
    homework,
    quiz,
    lessonCreatorPrompt,
    savedLessonId,
  ]);

  return {
    isRecording,
    isProcessing,
    statusMessage,
    transcription,
    lessonTitle,
    setLessonTitle,
    summary,
    keyPoints,
    condensedLesson,
    homework,
    quiz,
    lessonCreatorPrompt,
    ageRange,
    setAgeRange,
    savedLessonId,
    startRecording,
    stopRecording,
    handleFileUpload,
    analyzeText,
    saveLesson,
    transcribeTestAudio, // Expose mic test function
    isPartiallyProcessed, // Expose partial status
    reprocessWithFirebase, // Expose reprocessing function
  };
};
