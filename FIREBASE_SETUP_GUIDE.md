# 🔥 Guía Completa de Configuración de Firebase

## Paso 1: Crear Proyecto Firebase

### Acceder a Firebase Console:
1. Ve a **[console.firebase.google.com](https://console.firebase.google.com)**
2. Inicia sesión con tu cuenta de Google
3. Click **"Create a project"** (o "Add project")

### Configurar Proyecto:
1. **Project name**: `comercializadora-cf`
2. **Project ID**: Se genera automáticamente (ej: `comercializadora-cf-12345`)
3. **Enable Google Analytics**: ✅ Recomendado (para métricas)
4. **Analytics account**: Crear nueva o usar existente
5. Click **"Create project"**

---

## Paso 2: Configurar Authentication

### Habilitar Authentication:
1. En el menú lateral: **"Authentication"**
2. **"Get started"**
3. **"Sign-in method"** tab
4. Habilitar proveedores:
   - ✅ **Email/Password** (principal)
   - ✅ **Google** (opcional, recomendado)
   - ✅ **Anonymous** (para usuarios temporales)

### Configurar dominio autorizado:
1. **"Settings"** → **"Authorized domains"**
2. Agregar dominios:
   - `localhost` (desarrollo)
   - `tu-dominio.netlify.app` (producción)
   - Tu dominio personalizado (si tienes)

---

## Paso 3: Configurar Firestore Database

### Crear Base de Datos:
1. En el menú lateral: **"Firestore Database"**
2. **"Create database"**
3. **Security rules**: Seleccionar **"Start in test mode"** (temporal)
4. **Location**: Seleccionar región más cercana (ej: `us-central1`)
5. **"Done"**

### Configurar Reglas de Seguridad:
Las reglas ya están en tu proyecto (`firestore.rules`). Se aplicarán automáticamente con el deploy.

---

## Paso 4: Configurar Storage (Opcional)

### Habilitar Cloud Storage:
1. En el menú lateral: **"Storage"**
2. **"Get started"**
3. **Security rules**: **"Start in test mode"**
4. **Location**: Misma región que Firestore
5. **"Done"**

---

## Paso 5: Crear Web App y Obtener Configuración

### Agregar Web App:
1. En **"Project Overview"** → Click el ícono **"Web"** (`</>`)
2. **App nickname**: `comercializadora-cf-web`
3. ✅ **"Also set up Firebase Hosting"** (opcional)
4. **"Register app"**

### Copiar Configuración Firebase:
Aparecerá un código como este:

```javascript
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "comercializadora-cf-12345.firebaseapp.com",
  projectId: "comercializadora-cf-12345",
  storageBucket: "comercializadora-cf-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789",
  measurementId: "G-XXXXXXXXXX"
};
```

### ⚠️ IMPORTANTE: Copiar Cada Valor
Necesitas extraer cada valor para los GitHub Secrets:

```bash
VITE_FIREBASE_API_KEY = "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
VITE_FIREBASE_AUTH_DOMAIN = "comercializadora-cf-12345.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID = "comercializadora-cf-12345"
VITE_FIREBASE_STORAGE_BUCKET = "comercializadora-cf-12345.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID = "123456789012"
VITE_FIREBASE_APP_ID = "1:123456789012:web:abcdef123456789"
VITE_FIREBASE_MEASUREMENT_ID = "G-XXXXXXXXXX"
```

---

## Paso 6: Configurar Firebase CLI (Opcional)

### Instalar Firebase CLI:
```bash
npm install -g firebase-tools
```

### Inicializar proyecto:
```bash
firebase login
firebase init
```

### Seleccionar servicios:
- ✅ Firestore
- ✅ Functions (si planeas usar Cloud Functions)
- ✅ Hosting (opcional)
- ✅ Storage

---

## Paso 7: Verificar Configuración

### Verificar en Firebase Console:
1. **Authentication** → Métodos habilitados ✅
2. **Firestore** → Base de datos creada ✅
3. **Project settings** → **General** → Web app registrada ✅

### Verificar configuración local:
Tu archivo `src/firebase/config.ts` debería usar variables de entorno:

```typescript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};
```

---

## 📋 Checklist de Configuración Firebase

- [ ] Proyecto Firebase creado
- [ ] Authentication habilitado (Email/Password)
- [ ] Firestore Database creado
- [ ] Web app registrada
- [ ] Configuración Firebase copiada
- [ ] 7 valores extraídos para GitHub Secrets
- [ ] Dominios autorizados configurados

---

## 🚀 Siguiente Paso

Una vez completada la configuración Firebase:

1. **Tienes 7 valores Firebase** para GitHub Secrets
2. **Combinar con 3 valores Netlify** = 10 secrets totales
3. **Agregar todos los secrets en GitHub**
4. **Activar pipeline CI/CD**

---

## 🔍 Ubicaciones Importantes

### Para encontrar la configuración después:
1. **Firebase Console** → Tu proyecto
2. **Project settings** (ícono engrane)
3. **General** tab → Scroll down → **Your apps**
4. Click en tu web app → **Firebase SDK snippet** → **Config**

### Enlaces directos:
- **Firebase Console**: [console.firebase.google.com](https://console.firebase.google.com)
- **Tu repositorio**: [github.com/GETINSOFT01/comercializadora-cf](https://github.com/GETINSOFT01/comercializadora-cf)

¿Necesitas ayuda con algún paso específico de Firebase o estás listo para agregar los secrets en GitHub?
