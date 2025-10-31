//src/components/AuthModal.jsx
import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { firestore } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import "./AuthModal.css";

const AuthModal = ({ onClose }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, register, authError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistError, setWaitlistError] = useState("");
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);

  const allowRegistration = import.meta.env.MODE === "development";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    let success = false;
    if (isLoginView) {
      success = await login(email, password);
    } else {
      success = await register(email, password);
    }
    setIsLoading(false);
    if (success) {
      onClose();
    }
  };

  const handleWaitlistSubmit = async (e) => {
    e.preventDefault();
    setWaitlistError("");
    if (!validateEmail(waitlistEmail)) {
      setWaitlistError("Please enter a valid email address.");
      return;
    }
    setIsLoading(true);
    try {
      await addDoc(collection(firestore, "waitlist"), {
        email: waitlistEmail,
        createdAt: new Date(),
      });
      setWaitlistSuccess(true);
    } catch (error) {
      console.error("Error adding to waitlist: ", error);
      setWaitlistError("Something went wrong. Please try again.");
    }
    setIsLoading(false);
  };

  const validateEmail = (email) => {
    const re =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };

  const WaitlistModal = () => (
    <div className="modal-overlay" onClick={() => setShowWaitlistModal(false)}>
      <div
        className="modal-content auth-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="close-button"
          onClick={() => setShowWaitlistModal(false)}
        >
          &times;
        </button>
        <h2>Join the Waitlist</h2>
        {waitlistSuccess ? (
          <div>
            <p>
              Thank you for joining the Skyline Nano Academy Waitlist! We'll be
              in touch.
            </p>
            <button
              className="submit-btn"
              onClick={() => setShowWaitlistModal(false)}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleWaitlistSubmit}>
            <p>
              Enter your email below to be notified when image generation and
              Firebase AI features are publicly available.
            </p>
            <div className="form-group">
              <label htmlFor="waitlist-email">Email</label>
              <input
                type="email"
                id="waitlist-email"
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                required
              />
            </div>
            {waitlistError && <p className="error-message">{waitlistError}</p>}
            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? "Submitting..." : "Join Waitlist"}
            </button>
          </form>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content auth-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <button className="close-button" onClick={onClose}>
            &times;
          </button>
          <h2>{isLoginView ? "Login to Continue" : "Register Account"}</h2>
          <p>
            Firebase AI (Cloud) features like image generation require an
            account to prevent misuse and manage costs.
          </p>
          <p>
            This project was developed for the Chrome Built-In Challenge so
            login capabilities are currently only available to the judges. If
            you’d like to know when Image gen/Firebase (Cloud) AI usage is generally
            available please click below to join the waitlist.
          </p>
          <button
            className="submit-btn"
            onClick={() => setShowWaitlistModal(true)}
          >
            Join Waitlist
          </button>

          <div className="divider"></div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {authError && <p className="error-message">{authError}</p>}

            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? "Processing..." : isLoginView ? "Login" : "Register"}
            </button>
          </form>

          {allowRegistration && (
            <p className="toggle-view">
              {isLoginView
                ? "Don't have an account?"
                : "Already have an account?"}
              <button onClick={() => setIsLoginView(!isLoginView)}>
                {isLoginView ? "Register" : "Login"}
              </button>
            </p>
          )}
        </div>
      </div>
      {showWaitlistModal && <WaitlistModal />}
    </>
  );
};

export default AuthModal;
