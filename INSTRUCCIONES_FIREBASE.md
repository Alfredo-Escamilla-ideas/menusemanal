# 📱 Configurar Sincronización Multi-Dispositivo

## ¿Por qué Firebase?

Firebase Firestore te permite sincronizar tu menú semanal automáticamente entre **todos tus dispositivos** (móvil, tablet, PC). Los cambios que hagas en un dispositivo aparecerán instantáneamente en los demás.

---

## 🚀 Configuración Paso a Paso (5 minutos)

### PASO 1: Crear un Proyecto Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Inicia sesión con tu cuenta de Google
3. Click en **"Agregar proyecto"** o **"Create a project"**
4. Nombre del proyecto: `menu-semanal` (o el que prefieras)
5. Desactiva **Google Analytics** (opcional, no es necesario)
6. Click en **"Crear proyecto"**
7. Espera unos segundos y click en **"Continuar"**

---

### PASO 2: Registrar la Aplicación Web

1. En la página principal del proyecto, busca el ícono **`</>`** (Web)
2. Dale un nombre: `Menu Web` (o el que prefieras)
3. **NO** marques "Firebase Hosting"
4. Click en **"Registrar app"**
5. **IMPORTANTE:** Verás un código JavaScript con un objeto `firebaseConfig`

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "menu-semanal-xxxxx.firebaseapp.com",
  projectId: "menu-semanal-xxxxx",
  storageBucket: "menu-semanal-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:..."
};
```

6. **Copia este objeto completo** (lo necesitarás en el PASO 4)
7. Click en **"Continuar a la consola"**

---

### PASO 3: Habilitar Firestore Database

1. En el menú izquierdo, click en **"Firestore Database"**
2. Click en **"Crear base de datos"** o **"Create database"**
3. Selecciona **"Comenzar en modo de prueba"** (Start in test mode)
   - ⚠️ Esto permite acceso sin autenticación por 30 días
   - Es perfecto para desarrollo y uso personal
4. Elige una ubicación cercana (ej: `europe-west` para Europa)
5. Click en **"Habilitar"** o **"Enable"**
6. Espera unos segundos hasta que se cree la base de datos

---

### PASO 4: Configurar el Archivo HTML

1. Abre el archivo `menu.html` en VS Code
2. Busca las líneas **379-385** (sección CONFIG DE FIREBASE)
3. Verás esto:

```javascript
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROJECT_ID.firebaseapp.com",
    projectId: "TU_PROJECT_ID",
    storageBucket: "TU_PROJECT_ID.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};
```

4. **Reemplázalo** con el objeto `firebaseConfig` que copiaste en el PASO 2
5. Guarda el archivo (`Ctrl + S`)

---

## ✅ ¡Listo!

Ahora abre `menu.html` en tu navegador. Si todo está correcto, verás en la consola del navegador (F12):

```
✅ Firebase conectado - Sincronización multi-dispositivo activada
```

### Prueba la sincronización:

1. Abre `menu.html` en tu PC
2. Arrastra alguna comida al menú
3. Abre el mismo archivo en tu móvil (súbelo a Google Drive o envíalo por WhatsApp)
4. **¡Los cambios aparecerán automáticamente!** ⚡

---

## 🔒 Seguridad (Opcional pero Recomendado)

El modo de prueba expira en **30 días**. Para uso prolongado, configura reglas de seguridad:

1. En Firebase Console, ve a **Firestore Database > Reglas**
2. Reemplaza las reglas con esto:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /menus/{menuId} {
      allow read, write: if true;
    }
  }
}
```

3. Click en **"Publicar"**

Esto permite que cualquiera con el link pueda editar el menú (perfecto para uso familiar).

---

## ❓ Solución de Problemas

**No se sincroniza entre dispositivos:**
- Verifica que hayas pegado correctamente el `firebaseConfig`
- Abre la consola del navegador (F12) y busca errores
- Asegúrate de que Firestore esté habilitado en Firebase Console

**Dice "Firebase no configurado":**
- Revisa que los valores en `firebaseConfig` no sean "TU_API_KEY", etc.
- Verifica que guardaste el archivo después de pegar la configuración

**Errores de permisos:**
- Asegúrate de estar en "modo de prueba" en Firestore
- O configura las reglas de seguridad como se muestra arriba

---

## 🌐 Modo Sin Firebase (Solo Dispositivo Local)

Si no configuras Firebase, la app funcionará perfectamente pero **solo en el dispositivo actual** usando `localStorage`. Los datos no se sincronizarán entre dispositivos.

---

## 💡 Consejos

- Puedes compartir el archivo `menu.html` con tu familia por WhatsApp/email
- Todos verán y editarán el mismo menú en tiempo real
- Los cambios se sincronizan instantáneamente (1-2 segundos)
- Funciona sin internet después de la primera carga (Firebase tiene caché)

---

¿Necesitas ayuda? Revisa la [documentación de Firebase](https://firebase.google.com/docs/firestore)
