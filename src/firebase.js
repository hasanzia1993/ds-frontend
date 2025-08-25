import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBC0l71lNX67vzlJwbjMtq14tbb30NX55k",
  authDomain: "dealersnap.firebaseapp.com",
  projectId: "dealersnap",
  storageBucket: "dealersnap.firebasestorage.app",
  messagingSenderId: "529614701568",
  appId: "1:529614701568:web:2be6f904ee62c08fa4c4e5",
  measurementId: "G-8BC9364B8N",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
