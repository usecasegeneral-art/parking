// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";
import { onValue } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";
import {update} from "./updater.js"
  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyC9fW5Wo5fXR9wYZIRrz378Sd_B8mhskeI",
    authDomain: "parking-d57ad.firebaseapp.com",
    databaseURL: "https://parking-d57ad-default-rtdb.firebaseio.com",
    projectId: "parking-d57ad",
    storageBucket: "parking-d57ad.firebasestorage.app",
    messagingSenderId: "219903768935",
    appId: "1:219903768935:web:b3e352eb05c3ec58d297c2",
    measurementId: "G-T4KYL916Y0"
  };
  
  // Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);

document.addEventListener("DOMContentLoaded", () => {
  const status = ref(db, "Live/status");
  const past = ref(db, "Live/past");
  onValue(status, update);
  //onValue(past, past_matches);

});
