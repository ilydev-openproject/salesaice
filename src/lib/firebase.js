// src/lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: 'AIzaSyB6trxr64644feNZphUB-YPcQo2LPmO7no',
    authDomain: 'aicesales-53099.firebaseapp.com',
    projectId: 'aicesales-53099',
    storageBucket: 'aicesales-53099.firebasestorage.app',
    messagingSenderId: '772699446314',
    appId: '1:772699446314:web:fe7b42f1de2c264e34f753',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
