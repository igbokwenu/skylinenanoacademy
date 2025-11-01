# Skyline Nano Academy

Skyline Nano Academy is a web-based AI education platform built with **React + Vite** and powered by **Gemini Nano** (Chrome Built-in AI APIs).  
It brings personalized, on-device learning to every student and educator — from K–12 to university — without relying on expensive cloud AI.

Public demo: [https://skylinenanoacademy.web.app/](https://skylinenanoacademy.web.app/)  
Public repository: [https://github.com/igbokwenu/skylinenanoacademy.git](https://github.com/igbokwenu/skylinenanoacademy.git)

---

## 🎥 Demo Video

Curious to see Skyline Nano Academy in action?  
Watch the full live demo on YouTube:  
👉 [https://youtu.be/xwqZhVIrJ0c](https://youtu.be/xwqZhVIrJ0c)

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

🔗 [Official Documentation: Chrome Built-in AI APIs](https://developer.chrome.com/docs/ai/built-in-apis)

Make sure you’ve enabled all the on-device APIs used in this project — including **Prompt**, **Writer**, **Rewriter**, **Proofreader**, and **Summarizer** — except **Translation** and **Language Detection**, which are not required in this project.

> ⚙️ **Tip:** The built-in APIs can be toggled via Chrome flags or experimental settings depending on your Chrome version. Check the documentation above for detailed up-to-date steps and compatibility notes.

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

| **Feature**                                       | **Primary On-Device API**                   | **Cloud AI Fallback (Firebase)**                                                                                                                                            |
| ------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Teacher Assistant**                             |                                             |                                                                                                                                                                             |
| **Audio Transcription (File Upload & Recording)** | `LanguageModel` (with audio input)          | `cloudTextModel`: The entire audio file is sent in a single request for faster, more accurate transcription without on-device chunking limitations.                         |
| **Generate Lesson Title**                         | `Writer`                                    | `cloudTextModel`: Part of a single, efficient JSON request during the full analysis reprocessing.                                                                           |
| **Generate Summary**                              | `Summarizer`                                | `cloudTextModel`: Part of a single, efficient JSON request during the full analysis reprocessing.                                                                           |
| **Extract Key Points**                            | `Summarizer`                                | `cloudTextModel`: Part of a single, efficient JSON request during the full analysis reprocessing.                                                                           |
| **Condense Lesson**                               | `Rewriter`                                  | `cloudTextModel`: Part of a single, efficient JSON request during the full analysis reprocessing.                                                                           |
| **Create Homework / Quiz / Lesson Prompt**        | `Writer`                                    | `cloudTextModel`: Part of a single JSON request if triggered via the full reprocessing feature.                                                                             |
| **Lesson Creator & Reteach Mode**                 |                                             |                                                                                                                                                                             |
| **Generate Full Lesson (Scenes, Quiz, etc.)**     | `LanguageModel` (with `responseConstraint`) | `cloudTextModel`: The prompt is appended with instructions to return a JSON object, mimicking the on-device schema constraint.                                              |
| **Analyze Student Image / Custom Character**      | `LanguageModel` (with multimodal input)     | `cloudTextModel`: The cloud model’s native ability to handle multimodal (image and text) input is used.                                                                     |
| **Generate Character Description**                | `LanguageModel` (text-only input)           | `cloudTextModel`: Fallback for expanded context and stylistic enhancements.                                                                                                 |
| **Image Generation**                              | _N/A_ (No on-device equivalent)             | **Cloud AI Only**: This feature exclusively uses the `imageModel` from Firebase AI, as on-device image generation is not part of the current built-in API set.              |
| **Lesson Preview & Publishing**                   |                                             |                                                                                                                                                                             |
| **Rewrite Scene / Selected Text**                 | `Rewriter`                                  | `cloudTextModel`: The text to be rewritten is sent to the general text model with a contextual prompt.                                                                      |
| **Generate Lesson Blurb (on Publish)**            | `Summarizer`                                | `cloudTextModel`: The cloud model is prompted to generate a short, compelling summary.                                                                                      |
| **Proofread Text and Suggest Corrections**        | `Proofreader`                               | _No Cloud Fallback_: This is a unique on-device-only feature. If the Proofreader API is unavailable, the “Edit Scene” button is hidden to prevent a broken user experience. |

## Known Issues

- **On-Device Audio Processing (Teacher Assistant Mode):**  
  When using live recording or uploading audio or video for transcription: While up to 12 hours of on-device transcription is supported, hardware limitations may cause the process to slow down significantly over time. It starts fast for the first few minutes but gradually becomes slower due to structural constraints.  
  **Recommendation:** For best results, use this feature for shorter lectures or defer to Firebase AI Logic for longer sessions and transcriptions.

## License

This project is licensed under the Apache License 2.0 — see the [LICENSE](LICENSE) file for details.

## Notices

See the [NOTICE](NOTICE) file for attributions to open-source components used directly or indirectly in this project.
