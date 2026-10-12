import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCCALbltVIszUlkC_8BfpG_RwA7zBxjcao",
  authDomain: "mini-root-calcuator.firebaseapp.com",
  projectId: "mini-root-calcuator",
  storageBucket: "mini-root-calcuator.firebasestorage.app",
  messagingSenderId: "1038353221412",
  appId: "1:1038353221412:web:a057321e83c7aa3a34d5b1",
  measurementId: "G-G3C24YCV6G"
};

const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);