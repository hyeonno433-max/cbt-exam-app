/**
 * Firebase Configuration
 * Firebase Firestore 설정 및 초기화
 */

// Firebase 설정값
const firebaseConfig = {
    apiKey: "AIzaSyCzlLJA1k9-fKHMPb3IivdnS_KZ2d1WbPM",
    authDomain: "cbt-exam-app.firebaseapp.com",
    projectId: "cbt-exam-app",
    storageBucket: "cbt-exam-app.firebasestorage.app",
    messagingSenderId: "112449081094",
    appId: "1:112449081094:web:c61814cdf79c5692021887",
    measurementId: "G-YKSE9BR8EF"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);

// Firestore 인스턴스
const db = firebase.firestore();

console.log("[Firebase] Initialized with project:", firebaseConfig.projectId);
