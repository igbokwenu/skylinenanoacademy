// src/App.jsx

import React, { useState, useEffect } from "react";
import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import "./App.css";
import HomePage from "./pages/HomePage";
import LessonCreatorPage from "./pages/LessonCreatorPage";
import ReteachModePage from "./pages/ReteachModePage";
import BrowseLessonsPage from "./pages/BrowseLessonsPage";
import FirebaseAiPage from "./pages/FirebaseAiPage"; // Import the new page
import { useMonitorDownload } from "./hooks/useMonitorDownload";

function App() {
  const [apiSupportStatus, setApiSupportStatus] = useState(
    "Checking for on-device AI support..."
  );

  const { downloadStatus } = useMonitorDownload();

  useEffect(() => {
    if ("LanguageModel" in self || "Writer" in self) {
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
          <NavLink
            to="/"
            className={({ isActive }) => (isActive ? "nav-active" : "")}
          >
            Home
          </NavLink>

          <NavLink
            to="/lesson-creator"
            className={({ isActive }) => (isActive ? "nav-active" : "")}
          >
            Lesson Creator
          </NavLink>

          <NavLink
            to="/reteach-mode"
            className={({ isActive }) => (isActive ? "nav-active" : "")}
          >
            Reteach Mode
          </NavLink>

          <NavLink
            to="/browse-lessons"
            className={({ isActive }) => (isActive ? "nav-active" : "")}
          >
            Browse Lessons
          </NavLink>
        </nav>

        <div className="status-bar">
          <strong>Global Status:</strong> {downloadStatus || apiSupportStatus}
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/lesson-creator" element={<LessonCreatorPage />} />
          <Route path="/reteach-mode" element={<ReteachModePage />} />
          <Route path="/browse-lessons" element={<BrowseLessonsPage />} />
          {/* Add the new route */}
        </Routes>
      </main>
    </div>
  );
}

export default App;
