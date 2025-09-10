# 🌐 Guía Detallada para Obtener Tokens de Netlify

## Paso 1: Crear Cuenta en Netlify

### Acceder a Netlify:
1. Ve a **[netlify.com](https://netlify.com)**
2. Click **"Sign up"** (o "Log in" si ya tienes cuenta)
3. **Importante**: Conecta con **GitHub** para autorización automática
4. Autoriza a Netlify para acceder a tus repositorios

---

## Paso 2: Crear Sitio Principal (Producción)

### Crear Nuevo Sitio:
1. En el Dashboard de Netlify, click **"New site from Git"**
2. Selecciona **"GitHub"**
3. Busca y selecciona el repositorio: **`comercializadora-cf`**
4. Configurar build settings:
   ```
   Build command: npm run build
   Publish directory: dist
   Node version: 18
   ```
5. Click **"Deploy site"**

### El sitio se desplegará automáticamente con un nombre aleatorio como:
`https://amazing-cupcake-123456.netlify.app`

---

## Paso 3: Obtener NETLIFY_SITE_ID (Producción)

### Ubicación del Site ID:
1. En tu sitio desplegado, click **"Site settings"**
2. En el menú lateral: **"General"**
3. Scroll down hasta **"Site information"**
4. **Site ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
5. **COPIAR este ID** → Este es tu `NETLIFY_SITE_ID`

**Ejemplo:**
```
Site ID: 12345678-abcd-1234-efgh-123456789012
```

---

## Paso 4: Crear Sitio de Staging

### Crear Segundo Sitio:
1. **"New site from Git"** → **GitHub** → Mismo repositorio `comercializadora-cf`
2. **Importante**: Cambiar el nombre del sitio:
   - En "Site settings" → "General" → "Site information"
   - **Site name**: `comercializadora-cf-staging`
3. Misma configuración de build:
   ```
   Build command: npm run build
   Publish directory: dist
   ```
4. **Deploy site**

### Obtener NETLIFY_STAGING_SITE_ID:
1. En el sitio staging: **"Site settings"** → **"General"** → **"Site information"**
2. **Site ID**: `yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy`
3. **COPIAR este ID** → Este es tu `NETLIFY_STAGING_SITE_ID`

---

## Paso 5: Obtener NETLIFY_AUTH_TOKEN

### Generar Personal Access Token:
1. Click en tu **avatar** (esquina superior derecha del dashboard)
2. **"User settings"**
3. En el menú lateral: **"Applications"**
4. **"Personal access tokens"**
5. **"New access token"**
6. **Name**: `comercializadora-cf-deploy`
7. **Scopes**: Dejar por defecto (acceso completo)
8. **"Generate token"**

### ⚠️ IMPORTANTE:
- El token se muestra **solo una vez**
- **COPIAR INMEDIATAMENTE** → Este es tu `NETLIFY_AUTH_TOKEN`
- Ejemplo: `nfp_1234567890abcdef1234567890abcdef12345678`

---

## 📋 Resumen de Tokens Obtenidos

Al final deberías tener:

```bash
# Sitio Principal (Producción)
NETLIFY_SITE_ID = "12345678-abcd-1234-efgh-123456789012"

# Sitio Staging  
NETLIFY_STAGING_SITE_ID = "87654321-dcba-4321-hgfe-210987654321"

# Token de Autenticación
NETLIFY_AUTH_TOKEN = "nfp_1234567890abcdef1234567890abcdef12345678"
```

---

## 🔍 Verificación

### Verificar que los sitios funcionan:
- **Producción**: `https://tu-sitio-principal.netlify.app`
- **Staging**: `https://comercializadora-cf-staging.netlify.app`

### Ambos sitios deberían mostrar tu aplicación React funcionando.

---

## 🚀 Siguiente Paso

Una vez que tengas los 3 tokens de Netlify, procede a:
1. Configurar Firebase (si aún no lo has hecho)
2. Agregar todos los secrets en GitHub
3. Activar el pipeline de CI/CD

**¿Necesitas ayuda con Firebase o agregando los secrets en GitHub?**
