// src/hooks/useTeacherAssistant.js

import { useState, useRef, useCallback } from "react";
import { useLanguageModel } from "./useLanguageModel";
import { db } from "../lib/db";

// --- CONFIGURATION ---
const CHUNK_SECONDS = 29; // Stay safely under the 30s limit

// --- AUDIO PROCESSING LOGIC (Directly from audio-splitter.html) ---
// This is the proven code for chunking and encoding audio.
function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function encodeWavPCM16(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const frames = audioBuffer.length;
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

  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = interleaved.byteLength;
  const headerSize = 44;
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
  // --- STATE AND REFS ---
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

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // --- GEMINI NANO HOOKS ---
  const { executePrompt: executeTranscription } = useLanguageModel({
    apiName: "LanguageModel",
  });
  const { executePrompt: executeSummarize } = useLanguageModel({
    apiName: "Summarizer",
  });
  const { executePrompt: executeRewrite } = useLanguageModel({
    apiName: "Rewriter",
  });
  const { executePrompt: executeWrite } = useLanguageModel({
    apiName: "Writer",
  });

  // --- CORE LOGIC: COMBINING THE EXAMPLES ---

  /**
   * Transcribes a single audio blob.
   * Logic is from mediarecorder-audio-prompt/script.js
   */
  const transcribeChunk = useCallback(
    async (blob) => {
      try {
        const arrayBuffer = await blob.arrayBuffer();
        // Using promptStreaming for potentially faster first-token responses
        const stream = await executeTranscription(
          [
            {
              role: "user",
              content: [
                { type: "text", value: "Transcribe this audio accurately." },
                { type: "audio", value: arrayBuffer },
              ],
            },
          ],
          { expectedInputs: [{ type: "audio" }] }
        );

        let fullResponse = "";
        // The hook's executePrompt already handles streaming, so we just await the final result.
        if (stream) {
          fullResponse = await stream;
        }
        return fullResponse || "";
      } catch (error) {
        console.error("Transcription error for chunk:", error);
        return `[Error Transcribing Chunk: ${error.message}]`;
      }
    },
    [executeTranscription]
  );

  /**
   * The main engine. Takes any audio blob, splits it, and transcribes sequentially.
   */
  const processAndTranscribeAudioBlob = useCallback(
    async (blob) => {
      setIsProcessing(true);
      // Clear all previous results for a new session
      setTranscription("");
      setSummary("");
      setKeyPoints("");
      setCondensedLesson("");
      setHomework("");
      setQuiz("");
      setLessonCreatorPrompt("");

      setStatusMessage("Step 1: Decoding audio file...");

      try {
        const arrayBuffer = await blob.arrayBuffer();
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await ac.decodeAudioData(arrayBuffer);

        const { sampleRate, numberOfChannels, duration } = audioBuffer;
        const chunkFrames = Math.floor(CHUNK_SECONDS * sampleRate);
        const numChunks = Math.ceil(duration / CHUNK_SECONDS);

        setStatusMessage(
          `Step 2: Sliced audio into ${numChunks} chunk(s). Starting transcription...`
        );

        let fullTranscript = "";
        for (let i = 0; i < numChunks; i++) {
          const chunkStart = i * chunkFrames;
          const thisFrames = Math.min(
            chunkFrames,
            audioBuffer.length - chunkStart
          );

          const chunkAB = new AudioBuffer({
            numberOfChannels,
            length: thisFrames,
            sampleRate,
          });
          for (let ch = 0; ch < numberOfChannels; ch++) {
            const src = audioBuffer
              .getChannelData(ch)
              .subarray(chunkStart, chunkStart + thisFrames);
            chunkAB.copyToChannel(src, ch, 0);
          }

          const wavBuffer = encodeWavPCM16(chunkAB);
          const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });

          setStatusMessage(
            `Step 3: Transcribing chunk ${i + 1} of ${numChunks}...`
          );
          const transcriptChunk = await transcribeChunk(wavBlob); // Await the result of one chunk
          fullTranscript += ` ${transcriptChunk}`;
          setTranscription(fullTranscript.trim()); // Update UI progressively
        }

        setStatusMessage("Transcription complete. Ready for analysis.");
      } catch (error) {
        setStatusMessage(
          `Critical Error: ${error.message}. Please try a different audio file.`
        );
        console.error("Full audio processing failed:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [transcribeChunk]
  );

  // --- UI-FACING HANDLERS ---

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const fullAudioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        processAndTranscribeAudioBlob(fullAudioBlob);
      };

      recorder.start();
      setIsRecording(true);
      setStatusMessage('Recording... Click "End Lesson" to stop and process.');
    } catch (err) {
      setStatusMessage(
        "Microphone access denied. Please check browser permissions."
      );
      console.error("Mic access error:", err);
    }
  }, [processAndTranscribeAudioBlob]);

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
      if (file) {
        processAndTranscribeAudioBlob(file);
      }
    },
    [processAndTranscribeAudioBlob]
  );

  // --- POST-TRANSCRIPTION ANALYSIS (No changes needed here) ---
  const analyzeText = async (type) => {
    if (!transcription || isProcessing) return;
    setIsProcessing(true);
    try {
      // ... (existing analysis logic is fine)
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
