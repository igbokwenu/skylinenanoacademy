//src/components/AuthModal.jsx
import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import "./AuthModal.css";

const AuthModal = ({ onClose }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, register, authError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // In a real production app, you might use environment variables
  // For this implementation, we'll allow registration.
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

  return (
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
          Cloud AI features require an account to prevent misuse and manage
          costs.
        </p>

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
  );
};

export default AuthModal;
