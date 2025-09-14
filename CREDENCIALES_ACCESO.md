# 🔐 Credenciales de Acceso - Comercializadora CF

## 🚨 Necesitas crear un usuario en Firebase Authentication

### **Opción 1: Crear Usuario desde Firebase Console**

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Proyecto **"comercializadora-cf"**
3. **Authentication** → **Users** → **Add user**
4. Crear usuario:
   - **Email**: admin@comercializadora-cf.com
   - **Password**: Admin123456!

### **Opción 2: Registro desde la App**

Si la app tiene registro habilitado:
1. Accede a http://localhost:5175/
2. Busca "Crear cuenta" o "Sign Up"
3. Registra un nuevo usuario

### **Opción 3: Usuario de Prueba Temporal**

Puedo modificar el código para crear un usuario de prueba automáticamente.

---

## 🔧 **Configuración Firebase Requerida**

### **Authentication Settings**:
1. Firebase Console → **Authentication** → **Sign-in method**
2. Habilitar **Email/Password**
3. Opcional: Habilitar **Google**, **Anonymous**

### **Firestore Rules** (Permitir acceso):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acceso temporal para desarrollo
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## ⚡ **Solución Rápida**

Te ayudo a:
1. **Crear usuario de prueba** en Firebase
2. **Configurar reglas** de acceso
3. **Proporcionar credenciales** listas

¿Prefieres que modifique el código para acceso temporal o que te guíe para crear el usuario en Firebase Console?
