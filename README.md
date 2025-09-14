# Comercializadora CF

Sistema de gestión empresarial desarrollado con React, TypeScript y Firebase para la administración de servicios, clientes y reportes empresariales.

## 🚀 Estado del Proyecto

- ✅ **Errores Críticos Resueltos**: Firestore y es-toolkit configurados correctamente
- ✅ **CI/CD Pipeline Activado**: GitHub Actions + Netlify deployment
- ✅ **PWA Completa**: Service Worker, offline support, install prompt
- ✅ **Monitoreo de Producción**: Web Vitals, error tracking, alertas automáticas
- ✅ **Catálogo Dinámico**: Gestión de tipos de servicio con CRUD completo

## 🛠️ Tecnologías Principales

- **Frontend**: React 19, TypeScript, Material-UI v7
- **Backend**: Firebase (Firestore, Auth, Storage, Functions)
- **Build Tool**: Vite con optimizaciones personalizadas
- **Testing**: Vitest, Cypress E2E
- **Deployment**: Netlify con GitHub Actions
- **Monitoring**: Web Vitals, custom performance tracking

## 📋 Funcionalidades

### Core Features
- **Gestión de Servicios**: CRUD completo con estados y seguimiento
- **Administración de Clientes**: Perfiles, historial, comunicación
- **Reportes y Analytics**: Dashboard con métricas de negocio
- **Catálogos Dinámicos**: Tipos de servicio configurables
- **Sistema de Roles**: Admin, Manager, Finance, Employee

### Características Técnicas
- **PWA**: Instalable, funciona offline, notificaciones push
- **Monitoreo**: Dashboard administrativo con métricas en tiempo real
- **Performance**: Lazy loading, code splitting, optimización de bundles
- **Seguridad**: Autenticación Firebase, reglas de Firestore, validación Zod

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+ 
- npm o yarn
- Cuenta de Firebase
- Cuenta de Netlify (para deployment)

### Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd comercializadora-cf
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   ```
   
   Editar `.env` con tus credenciales de Firebase:
   ```env
   VITE_FIREBASE_API_KEY=tu_api_key
   VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=tu_proyecto_id
   VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
   VITE_FIREBASE_APP_ID=tu_app_id
   VITE_FIREBASE_MEASUREMENT_ID=tu_measurement_id
   ```

4. **Configurar Firestore**
   - Crear proyecto en Firebase Console
   - Habilitar Firestore Database
   - Configurar reglas de seguridad (ver `firestore.rules`)
   - Habilitar Authentication con Email/Password

5. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```

## 📱 PWA Features

- **Service Worker**: Cache strategies optimizadas
- **Offline Support**: Funcionalidad básica sin conexión
- **Install Prompt**: Instalación nativa en dispositivos
- **Push Notifications**: Sistema preparado para notificaciones
- **Performance Monitoring**: Métricas Web Vitals en tiempo real

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo
npm run build           # Build de producción
npm run preview         # Preview del build

# Testing
npm run test            # Tests unitarios con Vitest
npm run test:ui         # UI de testing
npm run e2e             # Tests E2E con Cypress
npm run e2e:headless    # E2E sin interfaz

# Calidad de código
npm run lint            # ESLint
npm run lint:fix        # Fix automático de lint
npm run format          # Prettier formatting
npm run type-check      # Verificación de tipos

# PWA
npm run pwa:generate    # Generar assets PWA
```

## 📊 Monitoreo y Performance

### Dashboard de Monitoreo
Accede a `/admin/monitoring` para ver:
- Métricas de performance en tiempo real
- Alertas activas del sistema
- Logs de errores con stack traces
- Estadísticas de uptime
- Controles administrativos

### Métricas Clave
- **LCP** (Largest Contentful Paint): < 2.5s
- **CLS** (Cumulative Layout Shift): < 0.1
- **INP** (Interaction to Next Paint): < 200ms
- **TTFB** (Time to First Byte): < 600ms

## 🚀 Deployment

### GitHub Actions
El proyecto incluye workflows automatizados para:
- **Testing**: Lint, type-check, unit tests
- **Build**: Optimización y generación de assets
- **Deploy**: Staging en PRs, Production en merge a main

### Variables de Entorno Requeridas
Configurar en GitHub Secrets:
```
NETLIFY_AUTH_TOKEN=tu_netlify_token
NETLIFY_SITE_ID=tu_site_id_produccion
NETLIFY_STAGING_SITE_ID=tu_site_id_staging
VITE_FIREBASE_API_KEY=tu_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=tu_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_firebase_sender_id
VITE_FIREBASE_APP_ID=tu_firebase_app_id
VITE_FIREBASE_MEASUREMENT_ID=tu_firebase_measurement_id
```

## 🔧 Configuración Avanzada

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /service_types/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.token.role == 'admin';
    }
  }
}
```

### Vite Optimizations
```typescript
// vite.config.ts optimizations
optimizeDeps: {
  include: [
    '@mui/material',
    '@mui/icons-material', 
    'firebase/app',
    'firebase/auth',
    'firebase/firestore',
    'es-toolkit/compat/get'
  ]
}
```

## 📚 Documentación Adicional

- [Error Solutions Guide](./docs/ERROR_SOLUTIONS_AND_CONFIGURATION.md)
- [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)
- [API Documentation](./docs/API.md)
- [Contributing Guidelines](./docs/CONTRIBUTING.md)

## 🐛 Solución de Problemas

### Errores Comunes

1. **Error de conexión Firestore**
   - Verificar variables de entorno
   - Comprobar reglas de Firestore
   - Validar configuración de Firebase

2. **Error de build con es-toolkit**
   - Verificar configuración de Vite
   - Limpiar node_modules y reinstalar
   - Comprobar versiones de dependencias

3. **PWA no funciona**
   - Verificar HTTPS en producción
   - Comprobar Service Worker registration
   - Validar manifest.json

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](./LICENSE) para más detalles.

## 🤝 Contribuir

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📞 Soporte

Para soporte técnico o preguntas:
- Crear issue en GitHub
- Revisar documentación en `/docs`
- Consultar dashboard de monitoreo en `/admin/monitoring`

---

**Versión**: 1.0.0  
**Última actualización**: Septiembre 2024

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
