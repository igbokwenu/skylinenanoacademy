// src/hooks/useTeacherAssistant.js

import { useState, useRef, useCallback } from "react";
import { useLanguageModel } from "./useLanguageModel";
import { db } from "../lib/db";

// --- CONFIGURATION ---
const MAX_RECORDING_HOURS = 3;
const MAX_RECORDING_MS = MAX_RECORDING_HOURS * 60 * 60 * 1000;
const AUDIO_CHUNK_DURATION_S = 29; // 29 seconds to be safe with the 30s limit
const AUDIO_CHUNK_DURATION_MS = AUDIO_CHUNK_DURATION_S * 1000;

// --- AUDIO ENCODING HELPERS (from audio-splitter example) ---
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
  // --- STATE MANAGEMENT ---
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

  // --- HOOKS FOR GEMINI NANO APIS ---
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

  // --- REFS FOR RECORDING LOGIC ---
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const recordingTimerRef = useRef(null);

  /**
   * Transcribes a single audio blob using the Prompt API.
   */
  const transcribeChunk = useCallback(
    async (audioBlob) => {
      try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const result = await executeTranscription(
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
        return result || "";
      } catch (error) {
        console.error("Transcription error for chunk:", error);
        setStatusMessage(`Error during transcription: ${error.message}`);
        return "[Transcription Error]";
      }
    },
    [executeTranscription]
  );

  /**
   * Starts the recording session.
   */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      setIsRecording(true);
      setStatusMessage("Recording...");
      setTranscription("");

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          setStatusMessage(`Transcribing chunk...`);
          const newTranscript = await transcribeChunk(event.data);
          setTranscription((prev) => `${prev} ${newTranscript}`.trim());
          // Set status back to recording after a chunk is done
          if (mediaRecorderRef.current?.state === "recording") {
            setStatusMessage("Recording...");
          }
        }
      };

      recorder.onstop = () => {
        // Final cleanup
        audioStreamRef.current?.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setIsProcessing(false);
        setStatusMessage("Transcription complete. Ready for analysis.");
      };

      recorder.start(AUDIO_CHUNK_DURATION_MS);

      recordingTimerRef.current = setTimeout(stopRecording, MAX_RECORDING_MS);
    } catch (err) {
      setStatusMessage("Error: Could not access microphone.");
      console.error("Mic access error:", err);
    }
  };

  /**
   * Stops the recording session.
   */
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      setStatusMessage("Finalizing transcription...");
      setIsProcessing(true); // Indicate processing
      mediaRecorderRef.current.stop();
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
      }
    }
  }, []);

  /**
   * Handles uploaded audio files by splitting and transcribing them.
   */
  const handleFileUpload = async (file) => {
    if (!file) return;

    setIsProcessing(true);
    setTranscription("");
    setStatusMessage("Decoding audio file...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await ac.decodeAudioData(arrayBuffer);

      const { sampleRate, numberOfChannels, duration } = audioBuffer;
      const chunkFrames = Math.floor(AUDIO_CHUNK_DURATION_S * sampleRate);
      const numChunks = Math.ceil(duration / AUDIO_CHUNK_DURATION_S);

      let fullTranscript = "";
      for (let i = 0; i < numChunks; i++) {
        setStatusMessage(`Processing chunk ${i + 1} of ${numChunks}...`);
        const chunkStart = i * chunkFrames;
        const thisFrames = Math.min(
          chunkFrames,
          audioBuffer.length - chunkStart
        );

        const chunkAB = ac.createBuffer(
          numberOfChannels,
          thisFrames,
          sampleRate
        );
        for (let ch = 0; ch < numberOfChannels; ch++) {
          const src = audioBuffer
            .getChannelData(ch)
            .subarray(chunkStart, chunkStart + thisFrames);
          chunkAB.copyToChannel(src, ch, 0);
        }

        const wavBuffer = encodeWavPCM16(chunkAB);
        const blob = new Blob([wavBuffer], { type: "audio/wav" });

        setStatusMessage(`Transcribing chunk ${i + 1} of ${numChunks}...`);
        const transcriptChunk = await transcribeChunk(blob);
        fullTranscript += ` ${transcriptChunk}`;
        setTranscription(fullTranscript.trim());
      }

      setStatusMessage("Transcription complete. Ready for analysis.");
    } catch (error) {
      setStatusMessage(`File processing failed: ${error.message}`);
      console.error("File upload processing error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const analyzeText = async (type) => {
    if (!transcription) {
      setStatusMessage("No transcription available to analyze.");
      return;
    }
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
          break;
      }
    } catch (error) {
      setStatusMessage(`Error during analysis: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setStatusMessage("Analysis complete.");
    }
  };

  const saveLesson = async () => {
    if (!transcription) return;
    setStatusMessage("Saving lesson...");
    const newLesson = {
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
    try {
      await db.teacherAssistantLessons.add(newLesson);
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
