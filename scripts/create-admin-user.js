const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Inicializar Firebase Admin SDK
const serviceAccount = require('../firebase-admin-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'comercializadora-cf'
});

const auth = getAuth();
const db = getFirestore();

async function createAdminUser() {
  try {
    console.log('Creando usuario administrador...');
    
    // Crear usuario en Firebase Auth
    const userRecord = await auth.createUser({
      email: 'admin@comercializadora-cf.com',
      password: 'Admin123456!',
      displayName: 'Administrador',
      emailVerified: true
    });

    console.log('Usuario creado en Firebase Auth:', userRecord.uid);

    // Crear documento de usuario en Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email: 'admin@comercializadora-cf.com',
      displayName: 'Administrador',
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true
    });

    console.log('Documento de usuario creado en Firestore');
    console.log('✅ Usuario administrador creado exitosamente');
    console.log('Email: admin@comercializadora-cf.com');
    console.log('Password: Admin123456!');
    console.log('Rol: admin');

  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.log('El usuario ya existe. Actualizando información...');
      
      // Obtener el usuario existente
      const existingUser = await auth.getUserByEmail('admin@comercializadora-cf.com');
      
      // Actualizar password
      await auth.updateUser(existingUser.uid, {
        password: 'Admin123456!',
        emailVerified: true
      });

      // Actualizar o crear documento en Firestore
      await db.collection('users').doc(existingUser.uid).set({
        email: 'admin@comercializadora-cf.com',
        displayName: 'Administrador',
        role: 'admin',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true
      }, { merge: true });

      console.log('✅ Usuario administrador actualizado exitosamente');
    } else {
      console.error('Error creando usuario:', error);
    }
  }
}

createAdminUser().then(() => {
  console.log('Proceso completado');
  process.exit(0);
}).catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
