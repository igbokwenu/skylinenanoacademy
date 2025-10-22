// src/pages/BrowseLessonsPage.jsx

import React, { useState, useEffect, useMemo } from "react";
import placeholderImage from "../assets/skyline_nano_academy.png";
import LessonPlayer from "../components/LessonPlayer"; // We will create this next
import "./BrowseLessonsPage.css";
import { db } from "../lib/db"; // We will create this CSS file

// These params should match those in LessonCreatorPage
const lessonParams = {
  formats: ["Manga", "Storybook", "Comic Book", "Science Journal"],
  styles: ["Cartoon", "Photorealistic", "3D Animation", "Anime", "Watercolor"],
  tones: ["Educational", "Funny", "Suspenseful", "Dramatic", "Mysterious"],
  ageGroups: [
    "Grades 1-2 (Ages 6-7)",
    "Grades 3-5 (Ages 8-10)",
    "Grades 6-8 (Ages 11-13)",
    "Grades 9-12 (Ages 14-18)",
  ],
  perspectives: [
    "Third Person",
    "First Person",
    "Immersive (Student is a character)",
  ],
};

const BrowseLessonsPage = () => {
  const [lessons, setLessons] = useState([]);
  const [playingLesson, setPlayingLesson] = useState(null);
  const [filters, setFilters] = useState({
    format: "All",
    style: "All",
    tone: "All",
    ageGroup: "All",
    perspective: "All",
  });

  useEffect(() => {
    const fetchLessons = async () => {
      // Fetch all lessons from IndexedDB and order by creation date
      const storedLessons = await db.lessons
        .orderBy("createdAt")
        .reverse()
        .toArray();
      setLessons(storedLessons);
    };

    fetchLessons();

    // Dexie's liveQuery can also be used here for real-time updates
    // but a simple fetch is fine for this use case.
  }, []);

  const handleLessonRated = async (lessonId, rating) => {
    // Update the rating in the database
    await db.lessons.update(lessonId, { rating });
    // Update the local state to reflect the change immediately
    setLessons((prevLessons) =>
      prevLessons.map((lesson) =>
        lesson.id === lessonId ? { ...lesson, rating } : lesson
      )
    );
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === "All") return true;
        return lesson.metadata[key] === value;
      });
    });
  }, [lessons, filters]);

  // A new component to handle converting Blob to Object URL
  const LessonCardImage = ({ imageData, title }) => {
    const [imageUrl, setImageUrl] = useState(placeholderImage);

    useEffect(() => {
      if (imageData instanceof Blob) {
        const url = URL.createObjectURL(imageData);
        setImageUrl(url);

        // Clean up the object URL when the component unmounts to prevent memory leaks
        return () => URL.revokeObjectURL(url);
      }
    }, [imageData]);

    return <img src={imageUrl} alt={title} className="lesson-card-image" />;
  };

  return (
    <div className="browse-lessons-container">
      {playingLesson && (
        <LessonPlayer
          lesson={playingLesson}
          onClose={() => setPlayingLesson(null)}
          onLessonRated={handleLessonRated}
        />
      )}

      <div className="bl-header">
        <h1>Browse Published Lessons</h1>
        <p>Explore and play the lessons you've created and saved locally.</p>
      </div>

      <div className="bl-filters">
        {Object.entries(lessonParams).map(([key, values]) => (
          <div className="filter-item" key={key}>
            <label htmlFor={key}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </label>
            <select
              name={key.replace(/s$/, "")}
              id={key}
              onChange={handleFilterChange}
            >
              <option value="All">All</option>
              {values.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="bl-grid">
        {filteredLessons.length > 0 ? (
          filteredLessons.map((lesson) => (
            <div key={lesson.id} className="lesson-card">
              <LessonCardImage
                imageData={lesson.lesson[0]?.imageData}
                title={lesson.title}
              />
              <div className="lesson-card-content">
                <h3>{lesson.title}</h3>
                <p className="lesson-card-blurb">{lesson.blurb}</p>
                <div className="lesson-card-tags">
                  <span className="tag">{lesson.metadata.format}</span>
                  <span className="tag">{lesson.metadata.style}</span>
                  <span className="tag">{lesson.metadata.ageGroup}</span>
                </div>
                <button
                  className="play-btn"
                  onClick={() => setPlayingLesson(lesson)}
                >
                  Play Lesson
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="no-lessons-message">
            No published lessons found. Go to the Lesson Creator to make one!
          </p>
        )}
      </div>
    </div>
  );
};

export default BrowseLessonsPage;
