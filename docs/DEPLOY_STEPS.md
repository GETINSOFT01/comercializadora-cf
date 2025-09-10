# Pasos para Despliegue - Comercializadora CF

## 🚀 Guía Paso a Paso

### ✅ Paso 1: Repositorio Preparado
- [x] Repositorio git inicializado
- [x] Commit inicial realizado
- [x] Branch main configurado

### 📋 Paso 2: Configurar GitHub Repository

#### Crear Repositorio en GitHub:
```bash
# 1. Ve a github.com y crea nuevo repositorio
# 2. Nombre: comercializadora-cf
# 3. Descripción: Sistema de gestión PWA para Comercializadora CF
# 4. Público o Privado (según preferencia)
# 5. NO inicializar con README (ya tenemos archivos)
```

#### Conectar Repositorio Local:
```bash
git remote add origin https://github.com/TU_USUARIO/comercializadora-cf.git
git push -u origin main
```

### 🔑 Paso 3: Configurar GitHub Secrets
Sigue la guía: `docs/GITHUB_SECRETS_SETUP.md`

**Secrets requeridos:**
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID` 
- `NETLIFY_STAGING_SITE_ID`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

### 🌐 Paso 4: Configurar Netlify
Sigue la guía: `docs/NETLIFY_SETUP.md`

**Acciones:**
- Crear cuenta en Netlify
- Conectar repositorio GitHub
- Configurar build settings
- Obtener Site ID y Auth Token
- Crear sitio de staging

### 🧪 Paso 5: Primer Deploy (Staging)
```bash
# Crear branch para testing
git checkout -b feature/production-deploy-test

# Hacer pequeño cambio para trigger
echo "# Production Ready" >> README.md
git add README.md
git commit -m "feat: prepare for production deployment"

# Push y crear PR
git push origin feature/production-deploy-test
```

**En GitHub:**
1. Crear Pull Request
2. Verificar que GitHub Actions se ejecute
3. Revisar deploy automático a staging
4. Verificar Lighthouse audit

### ✅ Paso 6: Deploy a Producción
```bash
# Si staging funciona correctamente
# Merge PR a main branch
# Deploy automático a producción se ejecutará
```

### 🔍 Paso 7: Verificación Post-Deploy
- [ ] Sitio accesible en producción
- [ ] PWA funcional (install prompt)
- [ ] Service Worker registrado
- [ ] Métricas de performance OK
- [ ] No errores en consola
- [ ] Funcionalidad offline

### 📊 Paso 8: Monitoreo
- [ ] Web Vitals reportando
- [ ] Error tracking activo
- [ ] Alertas configuradas
- [ ] Analytics funcionando

## 🎯 Estado Actual

### Completado:
- ✅ Código fuente completo
- ✅ PWA implementada
- ✅ CI/CD configurado
- ✅ Monitoreo implementado
- ✅ Documentación completa
- ✅ Repositorio git inicializado

### Siguiente Paso:
**Crear repositorio en GitHub y configurar secrets**

## 📞 Comandos Útiles

### Verificar Build Local:
```bash
npm run build
npm run preview
```

### Ejecutar Tests:
```bash
npm run test:unit
npm run lint
npm run type-check
```

### Debug Deploy:
```bash
# Ver logs de GitHub Actions
# Revisar Netlify deploy logs
# Verificar variables de entorno
```

---

**Nota:** Una vez configurados GitHub y Netlify, el proceso será completamente automático. Cada PR desplegará a staging y cada merge a main desplegará a producción.
