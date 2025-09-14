# 🔥 Firebase Local Setup - Error invalid-api-key

## 🚨 Error Actual
```
Firebase: Error (auth/invalid-api-key)
```

**Causa**: El archivo `.env` local no existe o tiene valores placeholder.

## ✅ Solución Rápida

### **Paso 1: Obtener Credenciales Firebase**

Ve a tu **Firebase Console**:
1. https://console.firebase.google.com/
2. Selecciona proyecto **"comercializadora-cf"**
3. **⚙️ Project Settings** → **General**
4. Scroll down → **Your apps** → **Web app**
5. **Config** → Copia los valores

### **Paso 2: Actualizar .env Local**

Edita el archivo `.env` creado con tus valores reales:

```bash
# Reemplaza estos valores con los de tu Firebase Console:
VITE_FIREBASE_API_KEY=AIzaSy[TU_API_KEY_REAL]
VITE_FIREBASE_AUTH_DOMAIN=comercializadora-cf.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=comercializadora-cf
VITE_FIREBASE_STORAGE_BUCKET=comercializadora-cf.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=[TU_SENDER_ID]
VITE_FIREBASE_APP_ID=1:[TU_APP_ID]
VITE_FIREBASE_MEASUREMENT_ID=G-[TU_MEASUREMENT_ID]
```

### **Paso 3: Reiniciar Servidor**

```bash
# Parar servidor actual (Ctrl+C)
# Luego reiniciar:
npm run dev
```

---

## 🔍 **Valores de Ejemplo** (Firebase Console):

```javascript
// Firebase Config Object (en Console):
const firebaseConfig = {
  apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "comercializadora-cf.firebaseapp.com",
  projectId: "comercializadora-cf",
  storageBucket: "comercializadora-cf.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890abcdef",
  measurementId: "G-XXXXXXXXXX"
};
```

---

## ⚡ **Solución Temporal** (Sin Firebase):

Si no tienes acceso a Firebase, puedes deshabilitar temporalmente:

```typescript
// En src/firebase/config.ts - comentar la inicialización:
// export const auth = getAuth(app);
// export const db = getFirestore(app);
```

**Después de actualizar .env, el error desaparecerá y Firebase funcionará correctamente.**
