// src/hooks/useTeacherAssistant.js

import { useState, useRef, useCallback } from "react";
import { useLanguageModel } from "./useLanguageModel"; // We still use this for Summarizer, etc.
import { db } from "../lib/db";

// --- CONFIGURATION ---
const CHUNK_SECONDS = 29;

// --- AUDIO PROCESSING UTILITIES (Proven from examples) ---
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
  // ... other state variables
  const [summary, setSummary] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [condensedLesson, setCondensedLesson] = useState("");
  const [homework, setHomework] = useState("");
  const [quiz, setQuiz] = useState("");
  const [lessonCreatorPrompt, setLessonCreatorPrompt] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const languageModelSessionRef = useRef(null); // Ref to hold a reusable session

  // Hooks for analysis APIs (these are fine)
  const { executePrompt: executeSummarize } = useLanguageModel({
    apiName: "Summarizer",
  });
  const { executePrompt: executeRewrite } = useLanguageModel({
    apiName: "Rewriter",
  });
  const { executePrompt: executeWrite } = useLanguageModel({
    apiName: "Writer",
  });

  /**
   * Dedicated, robust transcription function modeled DIRECTLY on the working example.
   * This is the core fix. It creates and manages its own session.
   */
  const transcribeAudioChunk = useCallback(async (blob) => {
    try {
      // Ensure a session exists, creating one if necessary.
      if (!languageModelSessionRef.current) {
        if (!("LanguageModel" in self)) {
          throw new Error("LanguageModel API not supported.");
        }
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
      // Destroy session on error so it can be re-created
      if (languageModelSessionRef.current) {
        languageModelSessionRef.current.destroy();
        languageModelSessionRef.current = null;
      }
      return "[TRANSCRIPTION ERROR]";
    }
  }, []);

  const resetStateForNewJob = () => {
    setTranscription("");
    setSummary("");
    setKeyPoints("");
    setCondensedLesson("");
    setHomework("");
    setQuiz("");
    setLessonCreatorPrompt("");
  };

  /**
   * The main engine for processing audio from any source (file or recording).
   */
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

        // The reliable, sequential processing loop
        let fullTranscript = "";
        for (const [index, chunk] of chunksToProcess.entries()) {
          setStatusMessage(
            `Step 3/3: Transcribing chunk ${index + 1} of ${totalChunks}...`
          );
          const transcriptPart = await transcribeAudioChunk(chunk); // Await each chunk
          fullTranscript += ` ${transcriptPart}`;
          setTranscription(fullTranscript.trim());
        }

        setStatusMessage("Transcription complete. Ready for analysis.");
      } catch (error) {
        console.error("Audio processing failed:", error);
        setStatusMessage(`Error during processing: ${error.message}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [transcribeAudioChunk]
  );

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
      // The onstop handler will trigger the rest of the process.
    }
  }, []);

  const handleFileUpload = useCallback(
    (file) => {
      if (file) processAudio(file);
    },
    [processAudio]
  );

  // --- ANALYSIS AND SAVE FUNCTIONS (Unchanged, now they will work) ---
  const analyzeText = async (type) => {
    if (!transcription || isProcessing) return;
    setIsProcessing(true);
    try {
      switch (type) {
        case "summary":
          setStatusMessage("Generating summary...");
          const summaryResult = await executeSummarize(transcription, {
            type: "tldr",
            length: "long",
          });
          setSummary(summaryResult);
          break;
        case "keyPoints":
          setStatusMessage("Generating key points...");
          const pointsResult = await executeSummarize(transcription, {
            type: "key-points",
            length: "long",
          });
          setKeyPoints(pointsResult);
          break;
        case "condense":
          setStatusMessage("Condensing lesson...");
          const condensedResult = await executeRewrite(transcription, {
            length: "shorter",
          });
          setCondensedLesson(condensedResult);
          break;
        case "homework":
          setStatusMessage("Creating homework...");
          const hwPrompt = `Based on this lesson transcript, create 5 homework questions with clear answers provided separately:\n\n${transcription}`;
          const hwResult = await executeWrite(hwPrompt, { length: "long" });
          setHomework(hwResult);
          break;
        case "quiz":
          setStatusMessage("Creating quiz...");
          const quizPrompt = `Based on this lesson transcript, create a 5-question multiple-choice quiz. For each question, provide 4 options and clearly indicate the correct answer:\n\n${transcription}`;
          const quizResult = await executeWrite(quizPrompt, { length: "long" });
          setQuiz(quizResult);
          break;
        case "lessonPrompt":
          setStatusMessage("Generating lesson creator prompt...");
          const lpPrompt = `Based on the following lesson transcript, create a detailed prompt for a lesson creator AI. The prompt should capture the core topic, key concepts, and suggest an engaging format (like a story or comic) and a target age group. The goal is to create a new, refined lesson based on this live one.\n\nTranscript:\n${transcription}`;
          const lpResult = await executeWrite(lpPrompt);
          setLessonCreatorPrompt(lpResult);
          break;
        default:
          setStatusMessage("Unknown analysis type.");
          break;
      }
      setStatusMessage("Analysis complete.");
    } catch (error) {
      setStatusMessage(`Error during analysis: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveLesson = async () => {
    if (!transcription) return;
    setStatusMessage("Saving lesson...");
    try {
      await db.teacherAssistantLessons.add({
        createdAt: new Date(),
        title: lessonTitle,
        transcription,
        summary,
        keyPoints,
        condensedLesson,
        homework,
        quiz,
        lessonCreatorPrompt,
      });
      setStatusMessage("Lesson saved successfully!");
    } catch (error) {
      setStatusMessage(`Failed to save lesson: ${error.message}`);
    }
  };

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
    startRecording,
    stopRecording,
    handleFileUpload,
    analyzeText,
    saveLesson,
  };
};
