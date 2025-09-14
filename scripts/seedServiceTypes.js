// Script to seed service types in Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

// Firebase config (replace with your actual config)
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

// Sample service types
const serviceTypes = [
  {
    name: 'Fumigación',
    description: 'Servicios de control de plagas y fumigación para hogares y empresas',
    active: true,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system'
  },
  {
    name: 'Limpieza',
    description: 'Servicios de limpieza profesional para oficinas y hogares',
    active: true,
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system'
  },
  {
    name: 'Mantenimiento',
    description: 'Servicios de mantenimiento preventivo y correctivo',
    active: true,
    order: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system'
  },
  {
    name: 'Jardinería',
    description: 'Servicios de jardinería y paisajismo',
    active: true,
    order: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system'
  },
  {
    name: 'Seguridad',
    description: 'Servicios de seguridad y vigilancia',
    active: true,
    order: 4,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system'
  }
];

async function seedServiceTypes() {
  try {
    console.log('Seeding service types...');
    
    for (const serviceType of serviceTypes) {
      const docRef = await addDoc(collection(db, 'service_types'), serviceType);
      console.log(`Added service type: ${serviceType.name} with ID: ${docRef.id}`);
    }
    
    console.log('✅ Service types seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding service types:', error);
  }
}

// Run the seed function
seedServiceTypes();
