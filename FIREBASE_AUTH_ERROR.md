# 🚨 Error Firebase Authentication - 400 Bad Request

## **Error Actual**:
```
POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX 400 (Bad Request)
```

## **Causas Posibles**:

### 1. **Email/Password no habilitado en Firebase**
- Firebase Console → Authentication → Sign-in method
- Email/Password debe estar **ENABLED**

### 2. **Usuario no existe en Firebase**
- El usuario `admin@comercializadora-cf.com` no está creado
- Necesitas crearlo manualmente

### 3. **API Key incorrecta o restringida**
- La API Key puede tener restricciones
- Verificar en Firebase Console → Project Settings

---

## ✅ **Soluciones**:

### **Paso 1: Habilitar Email/Password**
1. [Firebase Console](https://console.firebase.google.com/)
2. Proyecto "comercializadora-cf"
3. **Authentication** → **Sign-in method**
4. **Email/Password** → **Enable** → **Save**

### **Paso 2: Crear Usuario**
1. **Authentication** → **Users** → **Add user**
2. Email: `admin@comercializadora-cf.com`
3. Password: `Admin123456!`
4. **Add user**

### **Paso 3: Verificar API Key**
1. **Project Settings** → **General**
2. **Web API Key** debe coincidir con `.env`
3. Si es diferente, actualizar `.env`

---

## 🔧 **Solución Temporal - Bypass Auth**

Si no puedes configurar Firebase ahora, puedo deshabilitar temporalmente la autenticación:

```typescript
// Modificar AuthContext para bypass temporal
const mockUser = { uid: 'demo', email: 'demo@test.com' };
```

**Prioridad**: Configurar Firebase Authentication correctamente primero.
