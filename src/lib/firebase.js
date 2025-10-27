// src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize and export Firebase services
export const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);
export const auth = getAuth(app);

// Initialize the Google AI service
const ai = getAI(app, { backend: new GoogleAIBackend() });

export const cloudTextModel = getGenerativeModel(ai, {
  model: "gemini-2.5-flash",
});

export const cloudImageModel = getGenerativeModel(ai, {
  model: "gemini-2.5-flash-image",
});

// Helper to check for on-device support
export const isNanoSupported = async () => {
  try {
    return (
      "LanguageModel" in self &&
      (await self.LanguageModel.availability()) === "available"
    );
  } catch (error) {
    return false;
  }
};

// fileToGenerativePart remains unchanged
export async function fileToGenerativePart(file) {
  const base64EncodedDataPromise = new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}
