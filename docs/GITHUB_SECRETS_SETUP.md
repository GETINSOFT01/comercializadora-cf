# Configuración de GitHub Secrets

## 🔑 Paso 1: Configurar GitHub Secrets

### Acceder a GitHub Secrets:
1. Ve a tu repositorio en GitHub
2. Click en `Settings` (pestaña superior)
3. En el menú lateral izquierdo, click en `Secrets and variables` > `Actions`
4. Click en `New repository secret`

### Secrets Requeridos:

#### 🌐 Netlify Configuration
```bash
# Obtener de Netlify Dashboard > User settings > Applications > Personal access tokens
NETLIFY_AUTH_TOKEN=tu_netlify_auth_token_aqui

# Obtener de Netlify Dashboard > Site settings > General > Site information
NETLIFY_SITE_ID=tu_netlify_site_id_aqui

# Para staging (crear sitio separado en Netlify)
NETLIFY_STAGING_SITE_ID=tu_netlify_staging_site_id_aqui
```

#### 🔥 Firebase Configuration
```bash
# Obtener de Firebase Console > Project settings > General > Your apps > Web app config
VITE_FIREBASE_API_KEY=tu_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto-id
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

## 📋 Checklist de Configuración

### ✅ GitHub Secrets Configurados:
- [ ] `NETLIFY_AUTH_TOKEN`
- [ ] `NETLIFY_SITE_ID`
- [ ] `NETLIFY_STAGING_SITE_ID`
- [ ] `VITE_FIREBASE_API_KEY`
- [ ] `VITE_FIREBASE_AUTH_DOMAIN`
- [ ] `VITE_FIREBASE_PROJECT_ID`
- [ ] `VITE_FIREBASE_STORAGE_BUCKET`
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `VITE_FIREBASE_APP_ID`
- [ ] `VITE_FIREBASE_MEASUREMENT_ID`

### 🔍 Verificación:
1. Todos los secrets aparecen en la lista (valores ocultos)
2. No hay errores de sintaxis en los nombres
3. Los valores son correctos (sin espacios extra)

## 🚀 Siguiente Paso:
Una vez configurados todos los secrets, proceder con la creación del sitio en Netlify.
