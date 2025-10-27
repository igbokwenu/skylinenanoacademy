// src/pages/TeacherAssistantPage.jsx

import React from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { useTeacherAssistant } from "../hooks/useTeacherAssistant";
import AudioController from "../components/AudioController";
import LessonAnalysisPanel from "../components/LessonAnalysisPanel";
import DebugPanel from "../components/DebugPanel";
import "./TeacherAssistantPage.css";

const TeacherAssistantPage = () => {
  const teacherAssistantHook = useTeacherAssistant();
  const navigate = useNavigate(); // Hook for navigation

  return (
    <div className="page-container ta-page-container">
      <div className="lc-header">
        <h3>Teacher Assistant</h3>
        <p>
          Record your lesson, get instant transcriptions, summaries, and
          generate learning materials on the fly.
        </p>
        {/* --- NEW: Button to view saved lessons --- */}
        <button
          className="view-saved-btn"
          onClick={() => navigate("/teacher-assistant/saved")}
        >
          View Saved Sessions
        </button>
      </div>
      {/* <DebugPanel /> */}
      <div className="ta-main">
        {/* --- NEW: Age Range Selector --- */}
        <div className="age-range-selector">
          <label htmlFor="age-range">Target Age Group:</label>
          <select
            id="age-range"
            value={teacherAssistantHook.ageRange}
            onChange={(e) => teacherAssistantHook.setAgeRange(e.target.value)}
            disabled={
              teacherAssistantHook.isRecording ||
              teacherAssistantHook.isProcessing
            }
          >
            <option value="Grades 1-2 (Ages 6-7)">Grades 1-2 (Ages 6-7)</option>
            <option value="Grades 3-5 (Ages 8-10)">
              Grades 3-5 (Ages 8-10)
            </option>
            <option value="Grades 6-8 (Ages 11-13)">
              Grades 6-8 (Ages 11-13)
            </option>
            <option value="Grades 9-12 (Ages 14-18)">
              Grades 9-12 (Ages 14-18)
            </option>
            <option value="Undergraduate (Ages 18-22)">
              Undergraduate (Ages 18-22)
            </option>
            <option value="Graduate (Ages 23-26)">Graduate (Ages 23-26)</option>
            <option value="Postgraduate/Doctoral (Ages 27+)">
              Postgraduate/Doctoral (Ages 27+)
            </option>
          </select>
        </div>

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
