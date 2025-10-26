// src/pages/TeacherAssistantPage.jsx

import React from "react";
import { useTeacherAssistant } from "../hooks/useTeacherAssistant";
import AudioController from "../components/AudioController";
import LessonAnalysisPanel from "../components/LessonAnalysisPanel";
import "./TeacherAssistantPage.css";

const TeacherAssistantPage = () => {
  const teacherAssistantHook = useTeacherAssistant();

  return (
    <div className="page-container ta-page-container">
      <div className="lc-header">
        <h3>Teacher Assistant</h3>
        <p>
          Record your lesson, get instant transcriptions, summaries, and
          generate learning materials on the fly.
        </p>
      </div>

      <div className="ta-main">
        <AudioController
          isRecording={teacherAssistantHook.isRecording}
          isProcessing={teacherAssistantHook.isProcessing}
          startRecording={teacherAssistantHook.startRecording}
          stopRecording={teacherAssistantHook.stopRecording}
          handleFileUpload={teacherAssistantHook.handleFileUpload}
        />

        <LessonAnalysisPanel hook={teacherAssistantHook} />
      </div>
    </div>
  );
};

export default TeacherAssistantPage;
