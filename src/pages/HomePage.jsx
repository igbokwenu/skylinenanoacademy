import React from "react";
import { Link } from "react-router-dom";
import { Lightbulb, Target, BookOpen, BrainCircuit } from "lucide-react";
import "./HomePage.css";

const HomePage = () => {
  return (
    <div className="home-container">
      <section className="hero-section">
        <h1 className="hero-title">Welcome to Skyline Nano Academy</h1>
        <p className="hero-subtitle">
          Your Personal AI Teaching Assistant for Crafting Unforgettable,
          Story-Driven Lessons.
        </p>
        <p className="hero-description">
          Transform any topic into an engaging, illustrated storybook, comic, or
          manga. Personalize content for your students and help them master
          concepts with lessons tailored specifically to their needs.
        </p>
      </section>

      <section className="features-section">
        <h2 className="section-title">What You Can Do</h2>
        <div className="features-grid">
          <div className="feature-card">
            <Lightbulb size={48} className="feature-icon" />
            <h3>Create Custom Lessons</h3>
            <p>
              Enter any topic and let our AI generate a complete, multi-scene
              lesson with a title, paragraphs, stunning images, and a quiz.
            </p>
          </div>
          <div className="feature-card">
            <Target size={48} className="feature-icon" />
            <h3>Use Reteach Mode</h3>
            <p>
              Upload a struggling student's quiz, and the AI will analyze their
              mistakes to create a focused review lesson just for them.
            </p>
          </div>
          <div className="feature-card">
            <BrainCircuit size={48} className="feature-icon" />
            <h3>Personalize Everything</h3>
            <p>
              Make your student the main character of the story! Use their name,
              or even upload an image to infuse their likeness into the lesson's
              illustrations.
            </p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2 className="section-title">Get Started Now</h2>
        <div className="cta-buttons">
          <Link to="/lesson-creator" className="cta-button primary">
            Create a New Lesson
          </Link>
          <Link to="/reteach-mode" className="cta-button secondary">
            Help a Student Review
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
