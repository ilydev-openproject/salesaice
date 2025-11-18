// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB6trxr64644feNZphUB-YPcQo2LPmO7no",
  authDomain: "aicesales-53099.firebaseapp.com",
  projectId: "aicesales-53099",
  storageBucket: "aicesales-53099.firebasestorage.app",
  messagingSenderId: "772699446314",
  appId: "1:772699446314:web:fe7b42f1de2c264e34f753"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);