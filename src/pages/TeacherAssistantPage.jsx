// src/pages/TeacherAssistantPage.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTeacherAssistant } from "../hooks/useTeacherAssistant";
import { useAuth } from "../hooks/useAuth"; // Import auth hook
import AudioController from "../components/AudioController";
import LessonAnalysisPanel from "../components/LessonAnalysisPanel";
import MicrophoneCheckModal from "../components/MicrophoneCheckModal"; // Import new component
import AuthModal from "../components/AuthModal"; // Import auth modal
import "./TeacherAssistantPage.css";

const TeacherAssistantPage = () => {
  const teacherAssistantHook = useTeacherAssistant();
  const navigate = useNavigate();
  const { user } = useAuth(); // Get user status

  const [isMicCheckVisible, setIsMicCheckVisible] = useState(false);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);

  const handleReprocessClick = () => {
    if (user) {
      teacherAssistantHook.reprocessWithFirebase("analysis");
    } else {
      setIsAuthModalVisible(true);
    }
  };

  return (
    <div className="page-container ta-page-container">
      {isMicCheckVisible && (
        <MicrophoneCheckModal
          onClose={() => setIsMicCheckVisible(false)}
          transcribeTestAudio={teacherAssistantHook.transcribeTestAudio}
        />
      )}
      {isAuthModalVisible && (
        <AuthModal onClose={() => setIsAuthModalVisible(false)} />
      )}

      <div className="lc-header">
        <h3>Teacher Assistant</h3>
        <p>
          Record your lesson, get instant transcriptions, summaries, and
          generate learning materials on the fly.
        </p>
        <button
          className="view-saved-btn"
          onClick={() => navigate("/teacher-assistant/saved")}
        >
          View Saved Sessions
        </button>
      </div>

      <div className="ta-main">
        <div className="age-range-selector">{/* ... Unchanged ... */}</div>

        <AudioController
          isRecording={teacherAssistantHook.isRecording}
          isProcessing={teacherAssistantHook.isProcessing}
          startRecording={teacherAssistantHook.startRecording}
          stopRecording={teacherAssistantHook.stopRecording}
          handleFileUpload={teacherAssistantHook.handleFileUpload}
          onMicCheck={() => setIsMicCheckVisible(true)} // Pass handler
        />

        {/* --- NEW: Partial Processing & Reprocessing UI --- */}
        {teacherAssistantHook.isPartiallyProcessed && (
          <div className="reprocessing-banner">
            <p>
              Your audio was fully transcribed, but due to device limitations
              only a portion was analyzed. To process the entire transcript for
              a more accurate summary and key points, use Cloud AI.
            </p>
            <button
              onClick={handleReprocessClick}
              disabled={teacherAssistantHook.isProcessing}
            >
              {teacherAssistantHook.isProcessing
                ? "Processing..."
                : "Reprocess with Cloud AI"}
            </button>
          </div>
        )}

        <LessonAnalysisPanel hook={teacherAssistantHook} />
      </div>
    </div>
  );
};

export default TeacherAssistantPage;
