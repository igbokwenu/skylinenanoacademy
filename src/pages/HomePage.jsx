// src/pages/HomePage.jsx

import React from "react";
import { Link } from "react-router-dom";
import { Lightbulb, Target, BookOpen, BrainCircuit, Mic } from "lucide-react";
import "./HomePage.css";

const HomePage = () => {
  return (
    <div className="home-container">
      <section className="hero-section">
        <h1 className="hero-title">Welcome to Skyline Nano Academy</h1>
        <p className="hero-subtitle">
          Your On-Device AI Partner for Smart, Responsive Teaching.
        </p>
        <p className="hero-description">
          From live lecture transcriptions to personalized lesson plans,
          leverage the power of Gemini Nano to save time, engage students, and
          bring your teaching to the next level—all securely on your device.
        </p>
      </section>

      <section className="features-section">
        <h2 className="section-title">What You Can Do</h2>
        <div className="features-grid">
          {/* NEW: Teacher Assistant Feature Card */}
          <div className="feature-card primary-feature">
            <div className="feature-icon-wrapper">
              <Mic size={48} className="feature-icon" />
            </div>
            <h3>Live Teacher Assistant</h3>
            <p>
              Record your lessons in real-time. Get instant transcriptions,
              summaries, key points, and automatically generate quizzes or
              homework on the fly.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Lightbulb size={48} className="feature-icon" />
            </div>
            <h3>Create Custom Lessons</h3>
            <p>
              Enter any topic and let our AI generate a complete, story-driven
              lesson with stunning images and a quiz, tailored to any age group.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <BrainCircuit size={48} className="feature-icon" />
            </div>
            <h3>Personalize Everything</h3>
            <p>
              Make your student the hero of the story! Use their name or even
              upload an image to infuse their likeness into the lesson's
              illustrations.
            </p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2 className="section-title">Get Started Now</h2>
        <div className="cta-buttons">
          {/* NEW: Updated CTA buttons */}
          <Link to="/teacher-assistant" className="cta-button primary">
            <Mic size={20} />
            Open Teacher Assistant
          </Link>
          <Link to="/lesson-creator" className="cta-button secondary">
            <Lightbulb size={20} />
            Create a New Lesson
          </Link>
          <Link to="/browse-lessons" className="cta-button tertiary">
            <BookOpen size={20} />
            Browse Your Saved Lessons
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
