import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyCSaDOHnY6J7ZHZrME_Byt0_Xiqq6DvejA",
    authDomain: "futurevip-bde42.firebaseapp.com",
    projectId: "futurevip-bde42",
    storageBucket: "futurevip-bde42.firebasestorage.app",
    messagingSenderId: "729201771517",
    appId: "1:729201771517:web:7263a979a81c917599cf94",
    measurementId: "G-3D57G113V1"
  };

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
