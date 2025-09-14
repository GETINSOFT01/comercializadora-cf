// Script simple para agregar un tipo de servicio de prueba
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Firebase config
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addTestServiceType() {
  try {
    console.log('Agregando tipo de servicio de prueba...');
    
    const testServiceType = {
      name: 'Fumigación',
      description: 'Servicios de control de plagas y fumigación',
      active: true,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
    
    const docRef = await addDoc(collection(db, 'service_types'), testServiceType);
    console.log('✅ Tipo de servicio agregado con ID:', docRef.id);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addTestServiceType();
