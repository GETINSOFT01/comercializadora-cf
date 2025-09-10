# 🔑 Configurar GitHub Secrets - Lista Final

## Resumen: 10 Secrets Requeridos

### 📍 Ubicación en GitHub:
1. Ve a: **https://github.com/GETINSOFT01/comercializadora-cf**
2. **Settings** → **Secrets and variables** → **Actions**
3. **"New repository secret"** para cada uno

---

## 🌐 NETLIFY SECRETS (3 valores)

### Obtener de Netlify Dashboard:

#### 1. NETLIFY_AUTH_TOKEN
- **Ubicación**: Avatar → User settings → Applications → Personal access tokens
- **Acción**: New access token → Nombre: `comercializadora-cf-deploy`
- **Valor**: `nfp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

#### 2. NETLIFY_SITE_ID (Producción)
- **Ubicación**: Sitio principal → Site settings → General → Site information
- **Valor**: `12345678-abcd-1234-efgh-123456789012`

#### 3. NETLIFY_STAGING_SITE_ID
- **Ubicación**: Sitio staging → Site settings → General → Site information  
- **Valor**: `87654321-dcba-4321-hgfe-210987654321`

---

## 🔥 FIREBASE SECRETS (7 valores)

### Obtener de Firebase Console:
1. **console.firebase.google.com** → Tu proyecto
2. **Project settings** → **General** → **Your apps** → Web app
3. **Firebase SDK snippet** → **Config**

#### 4. VITE_FIREBASE_API_KEY
- **Valor**: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

#### 5. VITE_FIREBASE_AUTH_DOMAIN
- **Valor**: `tu-proyecto-12345.firebaseapp.com`

#### 6. VITE_FIREBASE_PROJECT_ID
- **Valor**: `tu-proyecto-12345`

#### 7. VITE_FIREBASE_STORAGE_BUCKET
- **Valor**: `tu-proyecto-12345.appspot.com`

#### 8. VITE_FIREBASE_MESSAGING_SENDER_ID
- **Valor**: `123456789012`

#### 9. VITE_FIREBASE_APP_ID
- **Valor**: `1:123456789012:web:abcdef123456789`

#### 10. VITE_FIREBASE_MEASUREMENT_ID
- **Valor**: `G-XXXXXXXXXX`

---

## ✅ Checklist de Configuración

### Netlify Setup:
- [ ] Cuenta Netlify creada
- [ ] Sitio principal conectado al repo
- [ ] Sitio staging creado
- [ ] Personal access token generado
- [ ] Site IDs copiados

### Firebase Setup:
- [ ] Proyecto Firebase creado
- [ ] Authentication habilitado
- [ ] Firestore Database creado
- [ ] Web app registrada
- [ ] Configuración Firebase copiada

### GitHub Secrets:
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

---

## 🚀 Después de Configurar Secrets

### Verificar configuración:
1. **GitHub** → **Settings** → **Secrets and variables** → **Actions**
2. Deberías ver **10 repository secrets**
3. Los valores están ocultos (correcto)

### Activar pipeline:
1. Crear Pull Request para testing
2. Deploy automático a staging
3. Merge a main para producción

---

## 📞 Enlaces Directos

- **Tu repositorio**: [github.com/GETINSOFT01/comercializadora-cf](https://github.com/GETINSOFT01/comercializadora-cf)
- **Netlify Dashboard**: [app.netlify.com](https://app.netlify.com)
- **Firebase Console**: [console.firebase.google.com](https://console.firebase.google.com)

Una vez configurados todos los secrets, el pipeline CI/CD estará completamente funcional.
