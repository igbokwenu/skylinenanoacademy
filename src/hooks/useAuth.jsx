//src/hooks/useAuth.js
import React, { useState, useEffect, createContext, useContext } from "react"; // Import React
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  updateDoc,
  increment,
} from "firebase/firestore";
import { firestore, app } from "../lib/firebase";

const AuthContext = createContext();

export const auth = getAuth(app);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [globalMessage, setGlobalMessage] = useState(null);

  useEffect(() => {
    // Clear message on user change
    setGlobalMessage(null);
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserInfo(userDoc.data());
        }
      } else {
        setUserInfo(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const register = async (email, password) => {
    try {
      setAuthError(null);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      await setDoc(doc(firestore, "users", user.uid), {
        email: user.email,
        createdAt: serverTimestamp(),
        firebaseAiCalls: 0,
        maxFreeCalls: 20,
      });
      // Re-fetch user info after registration
      const userDoc = await getDoc(doc(firestore, "users", user.uid));
      if (userDoc.exists()) setUserInfo(userDoc.data());
      return true;
    } catch (error) {
      setAuthError(error.message);
      return false;
    }
  };

  const login = async (email, password) => {
    try {
      setAuthError(null);
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error) {
      setAuthError(error.message);
      return false;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  // Expose a function to increment the call count
  const incrementCallCount = async () => {
    if (user) {
      const userDocRef = doc(firestore, "users", user.uid);
      await updateDoc(userDocRef, { firebaseAiCalls: increment(1) });
      setUserInfo((prev) => ({
        ...prev,
        firebaseAiCalls: prev.firebaseAiCalls + 1,
      }));
    }
  };

  useEffect(() => {
    if (userInfo && userInfo.firebaseAiCalls >= userInfo.maxFreeCalls) {
      setGlobalMessage({
        text: `You have reached your free Firebase AI usage limit (${userInfo.maxFreeCalls} calls).`,
        type: "error",
      });
    } else {
      setGlobalMessage(null);
    }
  }, [userInfo]);

  const value = {
    user,
    userInfo,
    loading,
    authError,
    register,
    login,
    logout,
    incrementCallCount,
    globalMessage,
  };

  // This is the return statement that requires the file to be .jsx
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
