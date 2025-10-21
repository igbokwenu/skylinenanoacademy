// src/App.jsx

import React, { useState, useEffect } from "react";

import { Routes, Route, NavLink, useLocation } from "react-router-dom";

import "./App.css";

import HomePage from "./pages/HomePage";

import LessonCreatorPage from "./pages/LessonCreatorPage";

import FirebaseAiPage from "./pages/FirebaseAiPage"; // Import the new page

import { useMonitorDownload } from "./hooks/useMonitorDownload";

function App() {
  const [apiSupportStatus, setApiSupportStatus] = useState(
    "Checking for on-device AI support..."
  );

  const { downloadStatus } = useMonitorDownload();

  const location = useLocation();

  useEffect(() => {
    if ("LanguageModel" in self || "Writer" in self) {
      setApiSupportStatus("On-device AI support detected.");
    } else {
      setApiSupportStatus(
        "On-device AI not supported. Use Chrome 127+ and enable #prompt-api flag."
      );
    }
  }, []);

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/lesson-creator":
        return "Robust On-Device AI - Lesson Creator";

      case "/firebase-ai":
        return "Robust On-Device AI - Firebase AI";

      case "/":

      default:
        return "Robust On-Device AI - Home";
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Skyline Nano Academy</h1>

        <nav className="main-nav">
          <NavLink
            to="/"
            className={({ isActive }) => (isActive ? "nav-active" : "")}
          >
            API Playground
          </NavLink>

          <NavLink
            to="/lesson-creator"
            className={({ isActive }) => (isActive ? "nav-active" : "")}
          >
            Lesson Creator
          </NavLink>

          <NavLink
            to="/firebase-ai"
            className={({ isActive }) => (isActive ? "nav-active" : "")}
          >
            Firebase AI
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
          <Route path="/firebase-ai" element={<FirebaseAiPage />} />{" "}
          {/* Add the new route */}
        </Routes>
      </main>
    </div>
  );
}

export default App;
