
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCJM3Pxc5X0Un1rAE94ArlEHJyFJ2tAkHs",
  authDomain: "trustport-25762.firebaseapp.com",
  projectId: "trustport-25762",
  storageBucket: "trustport-25762.firebasestorage.app",
  messagingSenderId: "387558321467",
  appId: "1:387558321467:web:fac5fd7d2565abd24d1b1e",
  measurementId: "G-SHHMVQHLVC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
