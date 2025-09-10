# 🔑 Configuración Interactiva de GitHub Secrets

## Paso 2: Configurar GitHub Secrets (CRÍTICO)

### 📍 Acceder a GitHub Secrets:
1. Ve a tu repositorio: `https://github.com/TU_USUARIO/comercializadora-cf`
2. Click en **Settings** (pestaña superior derecha)
3. En el menú lateral izquierdo: **Secrets and variables** → **Actions**
4. Click **"New repository secret"**

---

## 🌐 NETLIFY SECRETS (Obtener primero)

### Crear Cuenta Netlify:
1. Ve a [netlify.com](https://netlify.com) → **Sign up** (o Sign in)
2. Conecta con GitHub para autorización

### Obtener NETLIFY_AUTH_TOKEN:
1. En Netlify Dashboard → Click tu avatar (esquina superior derecha)
2. **User settings** → **Applications** → **Personal access tokens**
3. **New access token** → Nombre: `comercializadora-cf-deploy`
4. **Generate token** → **COPIAR TOKEN** (solo se muestra una vez)

### Crear Sitio Principal:
1. **New site from Git** → **GitHub** → Seleccionar `comercializadora-cf`
2. **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `18`
3. **Deploy site**

### Obtener NETLIFY_SITE_ID:
1. En tu sitio → **Site settings** → **General** → **Site information**
2. **Site ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` → **COPIAR**

### Crear Sitio Staging:
1. **New site from Git** → Mismo repositorio
2. Nombre del sitio: `comercializadora-cf-staging`
3. Misma configuración de build
4. **Deploy site**
5. **Copiar Site ID** del sitio staging

---

## 🔥 FIREBASE SECRETS (Obtener de Firebase Console)

### Acceder a Firebase Console:
1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
2. Selecciona tu proyecto (o crea uno nuevo)

### Obtener Configuración Web:
1. **Project settings** (ícono engrane) → **General**
2. Scroll down → **Your apps** → **Web app** (ícono `</>`
3. Si no tienes app web: **Add app** → **Web** → Nombre: `comercializadora-cf`
4. **Firebase SDK snippet** → **Config** → **COPIAR VALORES**

---

## 📝 CONFIGURAR SECRETS EN GITHUB

### Agregar cada secret individualmente:

#### 1. NETLIFY_AUTH_TOKEN
- **Name**: `NETLIFY_AUTH_TOKEN`
- **Secret**: `[tu_token_de_netlify]`
- **Add secret**

#### 2. NETLIFY_SITE_ID
- **Name**: `NETLIFY_SITE_ID`
- **Secret**: `[site_id_produccion]`
- **Add secret**

#### 3. NETLIFY_STAGING_SITE_ID
- **Name**: `NETLIFY_STAGING_SITE_ID`
- **Secret**: `[site_id_staging]`
- **Add secret**

#### 4-10. Firebase Secrets:
```
VITE_FIREBASE_API_KEY = "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
VITE_FIREBASE_AUTH_DOMAIN = "tu-proyecto.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID = "tu-proyecto-id"
VITE_FIREBASE_STORAGE_BUCKET = "tu-proyecto.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID = "123456789012"
VITE_FIREBASE_APP_ID = "1:123456789012:web:abcdef123456789"
VITE_FIREBASE_MEASUREMENT_ID = "G-XXXXXXXXXX"
```

---

## ✅ VERIFICACIÓN FINAL

### Checklist de Secrets:
- [ ] `NETLIFY_AUTH_TOKEN` ✓
- [ ] `NETLIFY_SITE_ID` ✓
- [ ] `NETLIFY_STAGING_SITE_ID` ✓
- [ ] `VITE_FIREBASE_API_KEY` ✓
- [ ] `VITE_FIREBASE_AUTH_DOMAIN` ✓
- [ ] `VITE_FIREBASE_PROJECT_ID` ✓
- [ ] `VITE_FIREBASE_STORAGE_BUCKET` ✓
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID` ✓
- [ ] `VITE_FIREBASE_APP_ID` ✓
- [ ] `VITE_FIREBASE_MEASUREMENT_ID` ✓

### Verificar en GitHub:
1. **Settings** → **Secrets and variables** → **Actions**
2. Deberías ver **10 secrets** listados
3. Los valores están ocultos (correcto)

---

## 🚀 SIGUIENTE PASO

Una vez configurados todos los secrets:
1. Crear Pull Request para activar pipeline
2. Verificar deploy automático a staging
3. Merge para deploy a producción

**¿Necesitas ayuda con algún paso específico?**
