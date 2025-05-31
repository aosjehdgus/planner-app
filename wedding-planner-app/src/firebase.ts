// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAKnU8JrttqbKBifR4erbhl_W-cK0cPM3k",
  authDomain: "wedding-planner-app-94e85.firebaseapp.com",
  projectId: "wedding-planner-app-94e85",
  storageBucket: "wedding-planner-app-94e85.firebasestorage.app",
  messagingSenderId: "287280918594",
  appId: "1:287280918594:web:cd280e9fb4de966c91bddb",
  measurementId: "G-1LKG2SYWWV",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
