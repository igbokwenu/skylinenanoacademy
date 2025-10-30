# Skyline Nano Academy

Skyline Nano Academy is a web-based AI education platform built with **React + Vite** and powered by **Gemini Nano** (Chrome Built-in AI APIs).  
It brings personalized, on-device learning to every student and educator — from K–12 to university — without relying on expensive cloud AI.

Public demo: [https://skylinenanoacademy.web.app/](https://skylinenanoacademy.web.app/)  
Public repository: [https://github.com/igbokwenu/skylinenanoacademy.git](https://github.com/igbokwenu/skylinenanoacademy.git)

---

## 🚀 Quick Start (Public Testing)

You can explore the platform directly here:  
👉 **[Skyline Nano Academy Web App](https://skylinenanoacademy.web.app/)**

You don’t need to install anything to test the core features (lesson generation, rewriter, proofreader, summarizer, etc.), as these are all powered by the **on-device Gemini Nano APIs** available in the latest Chrome versions.

> **Note:**  
> Some advanced features such as image generation and hybrid Firebase AI fallback require login credentials (Hackathon Judges have been provided a login credential in the devpost project submission).

---

## 🧑‍💻 Local Development Setup

If you want to clone and run the project locally:

### 1. Clone the repository

git clone https://github.com/igbokwenu/skylinenanoacademy.git
cd skylinenanoacademy

### 2. Install dependencies

npm install

### 3. (Optional) Configure Firebase AI

If you’d like to enable image generation or make the app compatible with browsers that don’t yet support Gemini Nano, create a .env file in the root directory and add your Firebase configuration:

VITE_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY"
VITE_FIREBASE_AUTH_DOMAIN="YOUR_FIREBASE_AUTH_DOMAIN"
VITE_FIREBASE_PROJECT_ID="YOUR_FIREBASE_PROJECT_ID"
VITE_FIREBASE_STORAGE_BUCKET="YOUR_FIREBASE_STORAGE_BUCKET"
VITE_FIREBASE_MESSAGING_SENDER_ID="YOUR_FIREBASE_MESSAGING_SENDER_ID"
VITE_FIREBASE_APP_ID="YOUR_FIREBASE_APP_ID"
VITE_FIREBASE_MEASUREMENT_ID="YOUR_FIREBASE_MEASUREMENT_ID"

Then in your Firebase Console:

Enable Firebase Authentication (email/password or any preferred method)

Enable Vertex AI Gemini API via Firebase AI Logic to activate image generation and multimedia processing

### 4. Start the development server

npm run dev

### 📦 Project Details

Framework: React.js with Vite
AI: Chrome Built-in AI APIs (Gemini Nano Writer, Rewriter, Proofreader, Summarizer)
Dependencies: firebase (specifically the 11.7.1-eap-ai-hybridinference.58d92df33 version for the hybrid logic), react-router-dom, dexie (for local storage).

## License

This project is licensed under the Apache License 2.0 — see the [LICENSE](LICENSE) file for details.

## Notices

See the [NOTICE](NOTICE) file for attributions to open-source components used directly or indirectly in this project.
