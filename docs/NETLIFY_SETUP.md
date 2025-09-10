# Configuración de Netlify

## 🌐 Paso 2: Crear Sitio en Netlify

### Crear Cuenta y Sitio:
1. Ve a [netlify.com](https://netlify.com) y crea cuenta (o inicia sesión)
2. Click en `New site from Git`
3. Conecta con GitHub y autoriza Netlify
4. Selecciona el repositorio `comercializadora-cf`

### Configuración de Build:
```bash
# Build settings
Build command: npm run build
Publish directory: dist
Node version: 18
```

### Variables de Entorno en Netlify:
1. Ve a `Site settings` > `Environment variables`
2. Agrega las siguientes variables:

```bash
# Build Configuration
NODE_VERSION=18
NPM_FLAGS=--production=false
VITE_APP_ENV=production

# Firebase Configuration (usar los mismos valores que en GitHub Secrets)
VITE_FIREBASE_API_KEY=tu_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto-id
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Performance & Features
VITE_PERFORMANCE_SAMPLE_RATE=0.1
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ENABLE_PWA_FEATURES=true
```

## 🔧 Configuración Avanzada

### Deploy Settings:
1. `Site settings` > `Build & deploy` > `Deploy contexts`
2. Configurar:
   - **Production branch**: `main`
   - **Branch deploys**: `All`
   - **Deploy previews**: `Any pull request against your production branch`

### Obtener Site ID y Auth Token:
```bash
# Site ID: Site settings > General > Site information
NETLIFY_SITE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Auth Token: User settings > Applications > Personal access tokens > New access token
NETLIFY_AUTH_TOKEN=tu_personal_access_token
```

## 📱 Crear Sitio de Staging

### Para Deploy Previews:
1. Crear segundo sitio en Netlify para staging
2. Misma configuración pero diferente nombre
3. Obtener `NETLIFY_STAGING_SITE_ID`

## ✅ Verificación:
- [ ] Sitio creado en Netlify
- [ ] Repositorio conectado
- [ ] Variables de entorno configuradas
- [ ] Site ID y Auth Token obtenidos
- [ ] Sitio de staging creado (opcional)

## 🚀 Siguiente Paso:
Configurar los tokens obtenidos como GitHub Secrets y realizar el primer deploy.
