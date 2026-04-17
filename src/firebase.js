import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyB_KUlv3qYYo8SIhCuVP12EqRyy2GNAbUw",
  authDomain: "familysync-223f3.firebaseapp.com",
  projectId: "familysync-223f3",
  storageBucket: "familysync-223f3.firebasestorage.app",
  messagingSenderId: "716995619071",
  appId: "1:716995619071:android:aea7
