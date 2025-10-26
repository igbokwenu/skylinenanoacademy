// src/App.jsx

import React, { useState, useEffect } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import "./App.css";
import HomePage from "./pages/HomePage";
import LessonCreatorPage from "./pages/LessonCreatorPage";
import ReteachModePage from "./pages/ReteachModePage";
import BrowseLessonsPage from "./pages/BrowseLessonsPage";
// Import the new page
import TeacherAssistantPage from "./pages/TeacherAssistantPage";
import { useMonitorDownload } from "./hooks/useMonitorDownload";

function App() {
  const [apiSupportStatus, setApiSupportStatus] = useState(
    "Checking for on-device AI support..."
  );
  const { downloadStatus } = useMonitorDownload();

  useEffect(() => {
    if ("LanguageModel" in self) {
      setApiSupportStatus("On-device AI support detected.");
    } else {
      setApiSupportStatus(
        "On-device AI not supported. Use Chrome 127+ and enable #prompt-api flag."
      );
    }
  }, []);

  return (
    <div className="container">
      <header>
        <h1>Skyline Nano Academy</h1>
        <nav className="main-nav">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/lesson-creator">Lesson Creator</NavLink>
          {/* Add the new NavLink */}
          <NavLink to="/teacher-assistant">Teacher Assistant</NavLink>
          <NavLink to="/reteach-mode">Reteach Mode</NavLink>
          <NavLink to="/browse-lessons">Browse Lessons</NavLink>
        </nav>
        <div className="status-bar">
          <strong>Global Status:</strong> {downloadStatus || apiSupportStatus}
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/lesson-creator" element={<LessonCreatorPage />} />
          {/* Add the new Route */}
          <Route path="/teacher-assistant" element={<TeacherAssistantPage />} />
          <Route path="/reteach-mode" element={<ReteachModePage />} />
          <Route path="/browse-lessons" element={<BrowseLessonsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
