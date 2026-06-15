"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    let unsubscribe;

    unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // 1. Sync session cookie FIRST
          const idToken = await firebaseUser.getIdToken();
          const response = await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });

          if (!response.ok) {
            console.error("AUTH_CONTEXT: Failed to sync session cookie");
          }

          // 2. Fetch additional user data from Firestore
          const userRef = doc(db, "users", firebaseUser.email);
          const userSnap = await getDoc(userRef);

          // 3. ONLY set the user state after cookie is (attempted to be) synced
          if (userSnap.exists()) {
            setUser({
              ...firebaseUser,
              ...userSnap.data(),
            });
          } else {
            setUser(firebaseUser);
          }
        } catch (error) {
          console.error("AUTH_CONTEXT: error during sync/fetch", error);
          setUser(firebaseUser); // Fallback to basic user
        }
      } else {
        // Clear session cookie
        await fetch("/api/auth/session", {
          method: "DELETE",
        });
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const googleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await saveUserToFirestore(result.user, "google");
      return result.user;
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const githubSignIn = async () => {
    const provider = new GithubAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await saveUserToFirestore(result.user, "github");
      return result.user;
    } catch (error) {
      console.error("Error signing in with Github:", error);
      throw error;
    }
  };


  const logout = async () => {
    try {
      await signOut(auth);
      // Clear session cookie
      await fetch("/api/auth/session", { method: "DELETE" });
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const saveUserToFirestore = async (user, providerName) => {
    try {
      const userRef = doc(db, "users", user.email);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          name: user.displayName,
          email: user.email,
          image: user.photoURL,
          provider: providerName,
          username: user.email.split("@")[0],
          xp: 0,
          roadmapLevel: {
            fast: 0,
            inDepth: 0,
            balanced: 0,
          },
          xptrack: Object.fromEntries(
            Array(12)
              .fill(0)
              .map((value, index) => [index, value])
          ),
          createdAt: Date.now(),
        });
      }
    } catch (error) {
      console.error("Error saving user information:", error);
    }
  };

  const getToken = async () => {
    const u = auth.currentUser;
    if (!u) return null;
    return await u.getIdToken();
  };

  return (
    <AuthContext.Provider value={{ user, loading, googleSignIn, githubSignIn, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
