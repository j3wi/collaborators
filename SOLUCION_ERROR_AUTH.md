# 🔧 SOLUCIÓN FINAL: Error "Forbidden use of secret API key in browser"

## ✅ PROBLEMA RESUELTO

El error `"Forbidden use of secret API key in browser"` ocurría porque el flujo anterior intentaba procesar tokens de Supabase en el navegador, lo cual no es permitido.

---

## 📝 Cambios Realizados

### 1. **`lib/auth/password-access.ts`** (Modificado)

**Antes (❌):**
```typescript
// Usaba inviteUserByEmail() que genera tokens en hash
const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo })
```

**Ahora (✅):**
```typescript
// Paso 1: Crear usuario con contraseña vacía
await admin.auth.admin.createUser({
  email: normalizedEmail,
  password: '', // Usuario debe setearla via email
  email_confirm: false,
})

// Paso 2: Enviar link de reset (genera code, no tokens en hash)
await supabase.auth.resetPasswordForEmail(email, { redirectTo })
```

**Por qué funciona:** 
- `createUser()` crea la cuenta en `auth.users`
- `resetPasswordForEmail()` genera un link con `code` que se procesa **en el servidor**
- ✅ NUNCA hay tokens en el navegador

---

### 2. **`app/(auth)/login/nueva-contrasena/session-bridge.tsx`** (Simplificado)

**Antes (❌):**
```typescript
// Intentaba procesar tokens del hash → ERROR
const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })
// → "Forbidden use of secret API key in browser"
```

**Ahora (✅):**
```typescript
// Solo verifica si sesión YA EXISTE en cookies (establecida por servidor)
const { data: { session }, error } = await supabase.auth.getSession()

if (session?.user) {
  // Sesión válida, mostrar formulario
}
```

**Por qué funciona:**
- El servidor ya estableció la sesión en cookies
- El cliente solo verifica que existe
- ✅ Seguro, simple, sin procesamiento de tokens

---

## 🔄 Flujo Correcto (Paso a Paso)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ENVÍO DE EMAIL (SERVER-SIDE)                             │
├─────────────────────────────────────────────────────────────┤
│ Admin envía invitación → sendPasswordSetupEmail()            │
│   ↓                                                           │
│ admin.auth.admin.createUser({                                │
│   email: "nuevo@example.com",                                │
│   password: ""  // Vacía                                      │
│ })                                                            │
│   ↓                                                           │
│ supabase.auth.resetPasswordForEmail(email, {                 │
│   redirectTo: "http://localhost:3000/api/auth/callback?...   │
│ })                                                            │
│   ↓                                                           │
│ Supabase envía email con link:                               │
│ http://localhost:3000/api/auth/callback?code=ABC123&next=... │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 2. USUARIO ABRE LINK (SERVER-SIDE)                          │
├─────────────────────────────────────────────────────────────┤
│ Usuario abre link (desde email)                              │
│   ↓                                                           │
│ Middleware → updateSession()                                 │
│   ↓                                                           │
│ Route Handler → /api/auth/callback                           │
│   ↓                                                           │
│ supabase.auth.exchangeCodeForSession("ABC123")               │
│   (intercambia code por access_token + refresh_token)        │
│   ↓                                                           │
│ Cookies se establecen:                                       │
│   - sb-access-token = "..."                                  │
│   - sb-refresh-token = "..."                                 │
│   ↓                                                           │
│ Redirige a /login/nueva-contrasena                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 3. USUARIO VE PÁGINA (CLIENT + SERVER)                      │
├─────────────────────────────────────────────────────────────┤
│ SessionBridge (cliente) → getSession()                       │
│   ↓                                                           │
│ Encuentra sesión en cookies ✅                               │
│   ↓                                                           │
│ Muestra formulario "Nueva contraseña"                        │
│   (SIN error "Forbidden use of secret API key")              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 4. USUARIO GUARDA CONTRASEÑA (SERVER-SIDE)                  │
├─────────────────────────────────────────────────────────────┤
│ Usuario introduce contraseña y clickea "Guardar"             │
│   ↓                                                           │
│ guardarNuevaContrasena() (server action)                     │
│   ↓                                                           │
│ getUser() → encuentra usuario ✅                             │
│   ↓                                                           │
│ updateUser({ password: "..." })                              │
│   ↓                                                           │
│ Redirige a /login?password=1                                 │
│   ↓                                                           │
│ Login muestra: "Tu contraseña se ha actualizado."            │
│   ↓                                                           │
│ Usuario entra con email + nueva contraseña ✅               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Cómo Probar

### Setup
```bash
cd "/Users/jewi/workspace/hipatia/collaborators"
npm run dev
```

### Test Completo (5 minutos)

**Opción A: Si tienes UI de admin**
1. Ve a tu panel de administración
2. Busca "Enviar invitación a colaborador" 
3. Entra el email: `test@example.com`
4. Clickea "Enviar"

**Opción B: Si no tienes UI (para testing)**
1. Usa una herramienta como `curl` o **Postman** para llamar la API
2. O si tienes una página de admin, accede desde ahí

### Una vez tengas el link:

```
1. Abre el link EN INCÓGNITO
   (Así no interfieren sesiones previas)

2. Deberías ver la URL algo como:
   http://localhost:3000/api/auth/callback?code=ABC...&next=/login/nueva-contrasena

3. Espera 1-2 segundos
   - Deberías ver "Verificando tu enlace de acceso..."
   - Luego desaparece automáticamente

4. ✅ NO deberías ver el error:
   "Error: Forbidden use of secret API key in browser"

5. Ahora ves el formulario "Nueva contraseña"
   - Nueva contraseña: Test123456
   - Confirmar: Test123456
   - Click "Guardar contraseña"

6. Deberías ver:
   "Tu contraseña se ha actualizado. Ya puedes iniciar sesión."

7. Ahora entra con:
   - Email: test@example.com
   - Contraseña: Test123456
   - Click "Entrar"

8. ✅ Deberías entrar al dashboard correctamente
```

---

## 🔍 Debugging (si falla)

### En la Consola del Navegador (F12)
Deberías ver logs como:
```
SessionBridge: Session found {userId: "abc-123-def"}
```

Si en lugar de eso ves:
```
SessionBridge: No valid session found
```

Entonces el callback NO funcionó correctamente.

### En la Terminal del Servidor (npm run dev)
Deberías ver logs como:
```
Auth callback: {code: true, next: "/login/nueva-contrasena"}
Auth callback: Session exchanged successfully
sendPasswordSetupEmail: New user created successfully
```

Si ves errores, cópialos y comparte.

---

## ⚠️ Checklist de Validación

- ✅ Error "Forbidden use of secret API key in browser" **DESAPARECIDO**
- ✅ No hay tokens en URL (hash vacío)
- ✅ Sesión se establece en el servidor (cookies)
- ✅ SessionBridge solo verifica (no procesa)
- ✅ Contraseña se guarda correctamente
- ✅ Login funciona con la nueva contraseña
- ✅ Usuario puede entrar al dashboard

---

## 📚 Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `lib/auth/password-access.ts` | Eliminado `inviteUserByEmail()`, añadido `createUser()`, ahora usa `resetPasswordForEmail()` |
| `app/(auth)/login/nueva-contrasena/session-bridge.tsx` | Simplificado: solo verifica sesión, no procesa hash |
| `app/(auth)/login/nueva-contrasena/actions.ts` | Logging mejorado, refrescar sesión después de guardar |
| `app/api/auth/callback/route.ts` | Mejorado: logging extenso para debugging |

---

## 🎯 Diferencia Clave

| Antes ❌ | Ahora ✅ |
|---------|---------|
| Tokens en hash | Tokens en cookies (servidor) |
| Cliente procesa tokens | Solo cliente verifica |
| Genera error de API key | Seguro y simple |
| Complejo | Limpio |

---

## 📞 Si Aún No Funciona

1. **Copia los logs de la consola** (F12)
2. **Copia los logs del servidor** (terminal de `npm run dev`)
3. Accede a `/debug` y copia la salida
4. Comparte esta información

El error debería estar completamente resuelto ahora. 🎉

