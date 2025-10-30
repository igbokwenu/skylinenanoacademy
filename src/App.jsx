import React, { useState, useEffect } from "react";
// FIX: BrowserRouter has been REMOVED from this import.
import { Routes, Route, NavLink } from "react-router-dom";
import { Info, LogIn, LogOut } from "lucide-react";
import "./App.css";
import HomePage from "./pages/HomePage";
import LessonCreatorPage from "./pages/LessonCreatorPage";
import ReteachModePage from "./pages/ReteachModePage";
import BrowseLessonsPage from "./pages/BrowseLessonsPage";
import TeacherAssistantPage from "./pages/TeacherAssistantPage";
import SavedTAPage from "./pages/SavedTAPage";
import { useMonitorDownload } from "./hooks/useMonitorDownload";
import { AuthProvider, useAuth } from "./hooks/useAuth.jsx";
import AuthModal from "./components/AuthModal";
import { isNanoSupported } from "./lib/firebase";

const AppContent = () => {
  // AppContent component remains completely unchanged.
  const [apiSupportStatus, setApiSupportStatus] = useState(
    "Checking for on-device AI support..."
  );
  const [isInfoVisible, setIsInfoVisible] = useState(false);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const { downloadStatus } = useMonitorDownload();
  const { user, logout, globalMessage } = useAuth();

  useEffect(() => {
    isNanoSupported().then((supported) => {
      if (supported) {
        setApiSupportStatus("On-device AI (Gemini Nano) is available.");
      } else {
        setApiSupportStatus(
          "On-device AI not supported. App will use Firebase AI (Cloud) for authenticated users."
        );
      }
    });
  }, []);

  return (
    <>
      {isAuthModalVisible && (
        <AuthModal onClose={() => setIsAuthModalVisible(false)} />
      )}

      <div className="container">
        <header>
          <h1>Skyline Nano Academy</h1>
          <nav className="main-nav">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/lesson-creator">Lesson Creator</NavLink>
            <NavLink to="/teacher-assistant">Teacher Assistant</NavLink>
            <NavLink to="/reteach-mode">Reteach Mode</NavLink>
            <NavLink to="/browse-lessons">Browse Lessons</NavLink>
          </nav>
          <div className="status-bar">
            <div className="status-text">
              <strong>Global Status:</strong>{" "}
              {downloadStatus || apiSupportStatus}
              <button
                className="info-btn"
                onClick={() => setIsInfoVisible(!isInfoVisible)}
              >
                <Info size={16} />
              </button>
              {user ? (
                <>
                  <span className="user-email">{user.email}</span>
                  <button onClick={logout} className="auth-btn">
                    <LogOut size={16} /> Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsAuthModalVisible(true)}
                  className="auth-btn"
                >
                  <LogIn size={16} /> Login
                </button>
              )}
            </div>
          </div>
          {globalMessage && (
            <div className={`global-message ${globalMessage.type}`}>
              {globalMessage.text}
            </div>
          )}
          {isInfoVisible && (
            <div className="info-box">
              {" "}
              <h4>On-Device AI Hardware Requirements (Chrome Browser: 138+)</h4>
              <ul>
                <li>
                  <strong>OS:</strong> Windows 10/11, macOS 13+, Linux, ChromeOS
                  (on Chromebook Plus).
                </li>
                <li>
                  <strong>Storage:</strong> At least 22 GB free space.
                </li>
                <li>
                  <strong>GPU:</strong> More than 4 GB of VRAM.
                </li>
                <li>
                  <strong>CPU:</strong> 16 GB of RAM or more, 4 CPU cores or
                  more.
                </li>
                <li>
                  <strong>Network:</strong> Unmetered connection for initial
                  Gemini Nano model download.
                </li>
              </ul>
            </div>
          )}
        </header>
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/lesson-creator" element={<LessonCreatorPage />} />
            <Route
              path="/teacher-assistant"
              element={<TeacherAssistantPage />}
            />
            <Route path="/teacher-assistant/saved" element={<SavedTAPage />} />
            <Route path="/reteach-mode" element={<ReteachModePage />} />
            <Route path="/browse-lessons" element={<BrowseLessonsPage />} />
          </Routes>
        </main>
      </div>
    </>
  );
};

// FIX: The App component NO LONGER has BrowserRouter.
// It is just a simple wrapper for the AuthProvider and AppContent.
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
