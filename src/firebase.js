import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBdojYV9gsEtQM9jmsorAMFm138ktmLpTc",
  authDomain: "hivewatch-webapp.firebaseapp.com",
  databaseURL: "https://hivewatch-webapp-default-rtdb.firebaseio.com/",
  projectId: "hivewatch-webapp",
  storageBucket: "hivewatch-webapp.firebasestorage.app",
  messagingSenderId: "998649107499",
  appId: "1:998649107499:web:1f39d445e7900f51a1866e",
  measurementId: "G-BVP79F19KF"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
console.log("Firebase config loaded:", firebaseConfig.apiKey);