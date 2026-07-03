// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAmu-iCP5tkMZRRMJAPOLvYbBFhCAXwdT4",
  authDomain: "mongu-institute.firebaseapp.com",
  projectId: "mongu-institute",
  storageBucket: "mongu-institute.firebasestorage.app",
  messagingSenderId: "1004897805677",
  appId: "1:1004897805677:web:82cade2f4176f920cbe664",
  measurementId: "G-VBR6CN36FW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
