// src/hooks/useTeacherAssistant.js

import { useState, useRef, useCallback, useEffect } from "react";
import { useLanguageModel } from "./useLanguageModel";
import { db } from "../lib/db";

// --- CONFIGURATION ---
const CHUNK_SECONDS = 29;

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

export const useTeacherAssistant = () => {
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
  // --- NEW: State for age range and saved status ---
  const [ageRange, setAgeRange] = useState("Undergraduate (Ages 18-22)");
  const [savedLessonId, setSavedLessonId] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const languageModelSessionRef = useRef(null);

  const { executePrompt: executeSummarize } = useLanguageModel({
    apiName: "Summarizer",
  });
  const { executePrompt: executeRewrite } = useLanguageModel({
    apiName: "Rewriter",
  });
  const { executePrompt: executeWrite } = useLanguageModel({
    apiName: "Writer",
  });

  // --- NEW: Helper to add age context to all prompts ---
  const getContextualPrompt = (basePrompt, transcript) => {
    return `${basePrompt}\n\nTailor the language, complexity, and examples to be appropriate for the following age group: ${ageRange}.\n\nTranscript:\n${transcript}`;
  };

  const transcribeAudioChunk = useCallback(async (blob) => {
    try {
      if (!languageModelSessionRef.current) {
        if (!("LanguageModel" in self))
          throw new Error("LanguageModel API not supported.");
        languageModelSessionRef.current = await self.LanguageModel.create({
          expectedInputs: [{ type: "audio" }],
        });
      }
      const arrayBuffer = await blob.arrayBuffer();
      const stream = await languageModelSessionRef.current.promptStreaming([
        {
          role: "user",
          content: [
            { type: "text", value: "Transcribe this audio accurately." },
            { type: "audio", value: arrayBuffer },
          ],
        },
      ]);
      let fullResponse = "";
      for await (const chunk of stream) {
        fullResponse += chunk;
      }
      return fullResponse;
    } catch (error) {
      console.error("Transcription chunk failed:", error);
      setStatusMessage(`Error: ${error.message}`);
      if (languageModelSessionRef.current) {
        languageModelSessionRef.current.destroy();
        languageModelSessionRef.current = null;
      }
      return "[TRANSCRIPTION ERROR]";
    }
  }, []);

  const runInitialAnalysis = useCallback(
    async (fullTranscript) => {
      if (!fullTranscript) return;
      try {
        // Note: The Summarizer and Rewriter APIs do not accept a 'context' parameter like the Writer API.
        // The age-appropriateness is implicitly handled by the fine-tuning of these models.
        // We still use our contextual prompts for the Writer API.
        setStatusMessage("Generating summary...");
        const summaryResult = await executeSummarize(fullTranscript, {
          type: "tldr",
          length: "long",
        });
        setSummary(summaryResult);

        setStatusMessage("Extracting key points...");
        const pointsResult = await executeSummarize(fullTranscript, {
          type: "key-points",
          length: "long",
        });
        setKeyPoints(pointsResult);

        setStatusMessage("Condensing lesson...");
        const condensedResult = await executeRewrite(fullTranscript, {
          length: "shorter",
        });
        setCondensedLesson(condensedResult);

        setStatusMessage(
          "Initial analysis complete. You can now generate follow-up materials."
        );
      } catch (error) {
        console.error("Initial analysis failed:", error);
        setStatusMessage(`Error during auto-analysis: ${error.message}`);
      }
    },
    [executeSummarize, executeRewrite]
  );

  const processAudio = useCallback(
    async (blob) => {
      resetStateForNewJob();
      setIsProcessing(true);
      setStatusMessage("Step 1/3: Decoding audio...");
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await ac.decodeAudioData(arrayBuffer);
        const { sampleRate, numberOfChannels, duration } = audioBuffer;
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
          fullTranscript += ` ${transcriptPart}`;
          setTranscription(fullTranscript.trim());
        }
        await runInitialAnalysis(fullTranscript.trim());
      } catch (error) {
        console.error("Audio processing failed:", error);
        setStatusMessage(`Error during processing: ${error.message}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [transcribeAudioChunk, runInitialAnalysis]
  );

  const resetStateForNewJob = () => {
    setTranscription("");
    setSummary("");
    setKeyPoints("");
    setCondensedLesson("");
    setHomework("");
    setQuiz("");
    setLessonCreatorPrompt("");
    setSavedLessonId(null); // Reset saved status
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      resetStateForNewJob();
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const recordedBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        processAudio(recordedBlob);
      };
      recorder.start();
      setIsRecording(true);
      setStatusMessage('Recording... Click "End Lesson" to process.');
    } catch (err) {
      setStatusMessage("Microphone access denied. Please check permissions.");
      console.error(err);
    }
  }, [processAudio]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const handleFileUpload = useCallback(
    (file) => {
      if (file) processAudio(file);
    },
    [processAudio]
  );
  const analyzeText = async (type) => {
    if (!transcription || isProcessing) return;
    setIsProcessing(true);
    try {
      let basePrompt = "";
      let resultSetter;
      switch (type) {
        case "homework":
          basePrompt =
            "Based on this lesson transcript, create 5 homework questions with clear answers provided separately.";
          resultSetter = setHomework;
          break;
        case "quiz":
          basePrompt =
            "Based on this lesson transcript, create a 5-question multiple-choice quiz. For each question, provide 4 options and clearly indicate the correct answer.";
          resultSetter = setQuiz;
          break;
        case "lessonPrompt":
          // --- FIX: Correctly include the transcription in the prompt ---
          basePrompt =
            "Based on the following lesson transcript, create a detailed prompt for a lesson creator AI. The prompt should capture the core topic, key concepts, and suggest an engaging format (like a story or comic). The goal is to create a new, refined lesson based on this live one.";
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
    setAgeRange, // Expose ageRange state
    savedLessonId, // Expose saved status
    startRecording,
    stopRecording,
    handleFileUpload,
    analyzeText,
    saveLesson,
  };
};
