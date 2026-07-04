<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Overview

**Programa Cuentas Colaboradores** — A Next.js 15+ web application for managing collaborators, patients, appointments, and billing for Hipatia (Centro de Psicología). Spanish-language UI with role-based access control.

**Tech Stack:**
- Framework: Next.js 15+ (App Router)
- Language: TypeScript (strict: false)
- Database: Supabase (PostgreSQL with custom enums)
- Authentication: Supabase Auth with SSR
- Styling: CSS (globals.css)
- Dependencies: zod, date-fns, @supabase/ssr, @supabase/supabase-js

## Architecture

### Route Structure

The app uses Next.js route groups and layouts for organization:

```
app/
  (auth)/               # Unauthenticated routes
    login/
  (protected)/          # Authenticated routes requiring requireProfile()
    layout.tsx          # Renders sidebar, enforces auth
    dashboard/
    pacientes/
    colaboradores/
    supervisores/
    ... other routes
  api/                  # API handlers
  logout/               # POST route for sign out
```

**Key Pattern:** Unauthenticated routes live in `(auth)` group. Protected routes live in `(protected)` group with layout that calls `requireProfile()` to enforce authentication.

### Authentication & Authorization

**Setup:**
- Supabase Auth manages users (`auth.users` table)
- Custom `profiles` table stores app-specific user data (nombre, apellidos, role, activo)
- Four roles defined as enum in database: `admin`, `supervisor`, `colaborador`, `paciente`

**Key Functions** (lib/auth/server.ts):
- `getCurrentProfile()` — Fetches authenticated user's profile from database, returns null if user not found or inactive
- `requireProfile()` — Wraps getCurrentProfile, redirects to /login if user not authenticated
- `canManageLiquidaciones(profile)` — Permission helper for admin/supervisor checks

**Pattern for Server Actions:**
```typescript
'use server'
import { requireProfile } from '@/lib/auth/server'

export async function myAction(formData: FormData) {
  const profile = await requireProfile()  // Enforces auth
  if (profile.role !== 'admin') throw new Error('Sin permiso')  // Role check
  // ... rest of action
}
```

### Server Actions & Forms

Server actions are colocated in `actions.ts` files next to their page components. They always:
1. Start with `'use server'` directive
2. Accept `FormData` parameter
3. Call `requireProfile()` for authentication
4. Check roles explicitly for authorization
5. Use `revalidatePath()` for cache invalidation after mutations

**Common Operations:**
- Form data extraction: `String(formData.get('fieldName'))`, `formData.getAll('multipleValues')`
- Database mutations use Supabase client
- Errors throw or redirect (e.g., `redirect('/login?error=1')`)
- After mutations, call `revalidatePath('/path')` to refresh data

### Supabase Integration

**Two Client Types:**
1. **Server Client** (`utils/supabase/server.ts`):
   - Used in Server Components and Server Actions
   - Manages authentication cookies automatically
   - Import: `import { createClient } from '@/utils/supabase/server'`
   - Usage: `const supabase = await createClient()`
   - Handles auth session persistence

2. **Browser Client** (`utils/supabase/client.ts`):
   - Used only in Client Components (`'use client'`)
   - For real-time subscriptions or client-side queries
   - Import: `import { createClient } from '@/utils/supabase/client'` with directive

**Database Type Generation:**
- TypeScript types in `types/database.types.ts` are initially placeholders (Record<string, any>)
- Regenerate types when schema changes: `npx supabase gen types typescript > types/database.types.ts`
- Build config (`next.config.mjs`) ignores TypeScript errors for placeholder types

### Middleware

Middleware (`middleware.ts`) runs on every request to update Supabase session via `utils/supabase/middleware`. Exempts static assets and _next paths.

## Conventions

### File Naming & Organization
- Page components: `page.tsx`
- Server actions: `actions.ts` (colocated with page)
- API routes: `app/api/*/route.ts`
- Utility functions: `lib/` or `utils/` with descriptive names

### TypeScript Usage
- `strict: false` — Relaxed type checking (use `any` for database placeholders)
- Path alias: `@/*` maps to project root (prefer over relative imports)
- Database types: use `as any` cast where database types are incomplete

### Error Handling in Server Actions
- Permission errors: throw new Error('Sin permiso')
- Database errors: throw new Error(error.message)
- Form validation errors: throw with message
- Redirect on auth failure: `redirect('/login?error=1')`

### Common Utilities
- `@supabase/ssr` — SSR-safe Supabase client creation with cookie management
- `date-fns` — Date formatting and calculations
- `zod` — Data validation (available for forms if needed)

## Key Files Reference

- `app/(protected)/layout.tsx` — Renders authenticated app shell with sidebar and role-based nav
- `lib/auth/server.ts` — Core auth helpers (getCurrentProfile, requireProfile)
- `utils/supabase/server.ts` — Server Supabase client factory
- `utils/supabase/client.ts` — Browser Supabase client factory
- `types/database.types.ts` — Database schema types (run `supabase gen types` to regenerate)
- `middleware.ts` — Global request middleware for session updates
- `package.json` — Run `npm run dev` for development, `npm run lint` for linting

## Important Notes

- Always await `createClient()` when creating Supabase instances (both server and middleware)
- Wrap Supabase operations with error handling or let errors throw to redirect
- After any data mutation, call `revalidatePath()` to invalidate Next.js cache
- Database relationships use join tables (paciente_colaborador, paciente_supervisor)
- Role permissions are explicitly checked in server actions—no implicit authorization
- The login form uses server action (`/app/(auth)/login/actions.ts`) to handle sign-in

