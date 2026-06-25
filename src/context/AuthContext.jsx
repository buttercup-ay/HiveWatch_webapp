import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { auth, db } from '../firebase';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [hiveId, setHiveId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          // Fetch the user's specific Hive profile from the database
          const userRef = ref(db, `users/${firebaseUser.uid}`);
          const snapshot = await get(userRef);
          
          if (snapshot.exists()) {
            const data = snapshot.val();
            setHiveId(data.hive_id || 'hive_001'); // Ensure a fallback
            setUserProfile(data);
          } else {
            console.warn("User database profile record missing.");
            setHiveId('hive_001');
          }
        } catch (err) {
          console.error("Error downloading user account settings profile:", err);
          setHiveId('hive_001');
        }
      } else {
        setUser(null);
        setHiveId(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  // Custom Registration: Creates the Auth user, then builds the DB profile
  const registerUser = async (name, email, phone, hive_id, password) => {
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      
      await set(ref(db, `users/${credential.user.uid}`), {
        name: name,
        email: email,
        phone: phone,
        hive_id: hive_id.trim(),
        createdAt: new Date().toISOString()
      });
      
      return credential.user;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const loginUser = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logoutUser = () => {
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, hiveId, userProfile, loading, loginUser, logoutUser, registerUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Export the hook directly from the context file for cleaner imports
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};