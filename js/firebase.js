import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBxduoIjvtM7arjMzKfwqDl4Rt-3eVogf8",
  authDomain: "landing-pro24.firebaseapp.com",
  projectId: "landing-pro24",
  storageBucket: "landing-pro24.firebasestorage.app",
  messagingSenderId: "705239660423",
  appId: "1:705239660423:web:f91ef0cc5e345791fb4522"
};

export const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
