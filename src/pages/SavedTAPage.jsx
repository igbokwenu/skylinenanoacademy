// src/pages/SavedTAPage.jsx

import React, { useState, useEffect } from "react";
import { db } from "../lib/db";
import { useNavigate } from "react-router-dom";
import "./SavedTAPage.css";

const SavedTAPage = () => {
  const [savedLessons, setSavedLessons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const lessons = await db.teacherAssistantLessons
          .orderBy("createdAt")
          .reverse()
          .toArray();
        setSavedLessons(lessons);
      } catch (error) {
        console.error("Failed to fetch saved lessons:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLessons();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this session?")) {
      await db.teacherAssistantLessons.delete(id);
      setSavedLessons((prev) => prev.filter((lesson) => lesson.id !== id));
    }
  };

  if (isLoading) return <div>Loading saved sessions...</div>;

  return (
    <div className="page-container saved-ta-page">
      <div className="lc-header">
        <h3>Saved Teacher Assistant Sessions</h3>
        <button
          onClick={() => navigate("/teacher-assistant")}
          className="back-btn"
        >
          &larr; Back to Teacher Assistant
        </button>
      </div>

      {savedLessons.length === 0 ? (
        <p className="no-lessons-message">No sessions have been saved yet.</p>
      ) : (
        <div className="sessions-list">
          {savedLessons.map((lesson) => (
            <details key={lesson.id} className="session-item">
              <summary>
                <div className="summary-header">
                  <span>
                    <strong>{lesson.title}</strong> -{" "}
                    {new Date(lesson.createdAt).toLocaleString()}
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(lesson.id);
                    }}
                    className="delete-session-btn"
                  >
                    Delete
                  </button>
                </div>
              </summary>
              <div className="session-content">
                {Object.entries(lesson).map(([key, value]) => {
                  if (
                    key === "id" ||
                    key === "createdAt" ||
                    key === "title" ||
                    !value
                  )
                    return null;
                  return (
                    <div key={key} className="content-section">
                      <h4>
                        {key
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (str) => str.toUpperCase())}
                      </h4>
                      <pre>{value}</pre>
                    </div>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedTAPage;
