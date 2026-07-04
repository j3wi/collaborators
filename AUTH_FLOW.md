# Flujo de Autenticación - Guía de Corrección

## 🔴 Problema Original
El error `"Forbidden use of secret API key in browser"` ocurría porque:
- Se usaba `inviteUserByEmail()` de Supabase que genera tokens especiales (`access_token` en hash)
- Estos tokens NO se pueden usar en el cliente con `setSession()` 
- El componente `SessionBridge` intentaba procesarlos → Supabase rechazaba

## ✅ Solución Implementada
Se ha cambiado a un **flujo 100% server-side** que usa el estándar de Supabase:

```
Email → Link con ?code= → Servidor intercambia code por sesión → Cliente recibe sesión en cookie
```

### Cambios Específicos:

#### 1. `lib/auth/password-access.ts`
- **Eliminado**: `inviteUserByEmail()` (causa el error)
- **Simplificado**: Usa SOLO `resetPasswordForEmail()` para ambos casos (nueva contraseña y reset)
- **Motivo**: `resetPasswordForEmail()` siempre usa `code` que se puede procesar en el servidor

#### 2. `app/(auth)/login/nueva-contrasena/session-bridge.tsx`
- **Antes**: Intentaba procesar tokens del hash (❌ causa error)
- **Ahora**: Solo verifica si ya existe sesión válida establecida por el servidor (✅ simple y seguro)
- **Ventaja**: No depende de tokens en hash, es idempotente

#### 3. No hay cambios en:
- `app/api/auth/callback/route.ts` → Sigue haciendo `exchangeCodeForSession(code)` en el servidor
- `middleware.ts` → Sigue actualizando sesión en cookies

---

## 🔄 Flujo Correcto Paso a Paso

### Cuando se envía un email:

```mermaid
1. Usuario (Admin) → envía link a colaborador
   ↓
2. sendPasswordSetupEmail() → llama resetPasswordForEmail()
   ↓
3. Supabase envía email con link:
   http://localhost:3000/api/auth/callback?code=ABC123XYZ&next=/login/nueva-contrasena
   ↓
```

### Cuando el usuario abre el link:

```
4. Link abre en navegador
   ↓
5. Middleware se ejecuta → updateSession()
   ↓
6. Route Handler `/api/auth/callback` procesa el code:
   - exchangeCodeForSession(code) ← ¡SERVIDOR, SEGURO!
   - Establece cookie sb-access-token, sb-refresh-token
   - Redirige a /login/nueva-contrasena
   ↓
7. Usuario llega a /login/nueva-contrasena CON sesión establecida en cookies
   ↓
8. SessionBridge verifica: getSession() → encuentra sesión ✅
   ↓
9. Muestra formulario "Nueva contraseña" (sin errores)
   ↓
10. Usuario escribe contraseña (min 8 chars)
    ↓
11. guardarNuevaContrasena():
    - Verifica getUser() ← encuentra usuario ✅
    - updateUser({ password }) ← éxito ✅
    - Redirige a /login?password=1
    ↓
12. Login muestra: "Tu contraseña se ha actualizado. Ya puedes iniciar sesión."
    ↓
13. Usuario entra con email + contraseña ✅
```

---

## 🧪 Cómo Probar

### Requisitos:
- Servidor dev corriendo: `npm run dev`
- Ventana incógnito (sin sesiones previas)

### Pasos:

**1. Generar un link de invitación:**
   - Accede a tu admin (si existe, o a `/debug`)
   - Busca la opción "Enviar invitación" para un colaborador
   - O usa esta URL temporal para testing:
     ```
     POST /api/admin/invite?email=test@example.com
     ```

**2. Abre el link EN INCÓGNITO:**
   - Copia el link del email
   - Nueva ventana incógnito
   - Pega el link
   - Deberías ver una URL como:
     ```
     http://localhost:3000/api/auth/callback?code=ABC...&next=/login/nueva-contrasena
     ```

**3. Esperá 2 segundos:**
   - Verás "Verificando tu enlace de acceso..."
   - Luego desaparece
   - Te redirige automáticamente a `/login/nueva-contrasena`
   - ✅ NO debería haber mensaje de error

**4. Define contraseña:**
   - Nueva contraseña: `MiPassword123!` (min 8 chars)
   - Confirmar contraseña: `MiPassword123!`
   - Click "Guardar contraseña"
   - ✅ Debería redirigir a `/login` con mensaje de éxito

**5. Prueba login:**
   - Email: `test@example.com`
   - Contraseña: `MiPassword123!`
   - Click "Entrar"
   - ✅ Debería entrar al dashboard

---

## 🔍 Debugging

### Si NO funciona:

**Opción 1: Abre Console (F12) en el navegador**
```javascript
// Deberías ver logs como:
// SessionBridge: Session found {userId: "abc-123-def"}
// O si falla:
// SessionBridge: No valid session found
```

**Opción 2: Abre el servidor (terminal)**
```bash
# Deberías ver logs en server como:
# sendPasswordSetupEmail: Using password reset flow for new user
# getPasswordFlowRedirectUrl: {redirectUrl: "http://localhost:3000/api/auth/callback?next=..."}
# Auth callback: Session exchanged successfully
```

**Opción 3: Página de debug**
- Abre: `http://localhost:3000/debug`
- Pega un link con hash y podrás ver:
  - Si hay tokens en el hash (no debería)
  - Estado de la sesión
  - Errores específicos

---

## 📋 Checklist de Cambios

- ✅ Eliminado `inviteUserByEmail()` (causa error de secret API key)
- ✅ Simplificado `SessionBridge` (no procesa hash)
- ✅ Flujo 100% server-side (seguro)
- ✅ ESLint sin errores
- ✅ Logging mejorado

---

## ⚠️ Notas Importantes

1. **NUNCA** usar tokens del hash en el cliente con Supabase - siempre causa errores
2. El `code` DEBE procesarse en el servidor con `exchangeCodeForSession()`
3. El middleware asegura que la sesión se propague correctamente
4. Si ves "Forbidden use of secret API key", es porque hay tokens en hash → revisar si se envió el link correcto

---

## 🎯 Diferencia Anterior vs Ahora

| Aspecto | Antes ❌ | Ahora ✅ |
|---------|---------|---------|
| Método de invita | `inviteUserByEmail()` | `resetPasswordForEmail()` |
| Tokens | En hash (`#access_token=`) | En `code` query param |
| Procesamiento | Cliente (genera error) | Servidor (seguro) |
| Complejidad | Alta (SessionBridge) | Baja (solo verificación) |
| Seguridad | Baja (tokens en cliente) | Alta (solo servidor) |

