# 6. Seguridad y riesgos

> **Leer primero.** Este relevamiento encontró problemas que permiten entrar a paneles ajenos y, potencialmente, leer o modificar toda la base. Están ordenados por urgencia. Ninguno fue corregido todavía: este documento describe el problema y la solución propuesta.

## Resumen

| # | Problema | Gravedad | Quién lo puede aprovechar |
|---|---|---|---|
| 0 | Clave `service_role` de Supabase publicada en el repo público | 🔴 Crítica | Cualquiera que vea GitHub |
| 1 | Login de negocio acepta cualquier contraseña | 🔴 Crítica | Cualquiera que sepa (o adivine) el email de un negocio |
| 2 | Login de Super Admin no verifica la contraseña | 🔴 Crítica | Cualquiera que sepa el email del dueño |
| 3 | Visitar la página de un negocio "loguea" en su panel | 🔴 Crítica | Cualquier visitante |
| 4 | La base de datos probablemente está abierta a la clave pública | 🔴 Crítica (a verificar) | Cualquiera con la clave `anon` (está en el JS público, es normal que esté) |
| 5 | Contraseñas en texto plano y contraseñas por defecto | 🟠 Alta | — |
| 6 | Rutas protegidas solo por `localStorage` | 🟠 Alta | Cualquier visitante |
| 7 | Reglas de negocio y comisiones calculadas en el navegador | 🟡 Media | Usuarios con conocimientos técnicos |
| 8 | Reseteo de contraseña que no cambia la contraseña | 🟡 Media (funcional) | — |
| 9 | Otros menores | 🟢 Baja | — |

---

## 0. Clave `service_role` publicada

**Dónde:** `seed.js`, `seed_promotions.js`, `migrate_auth.js`, `scripts/seed80FullBusinesses.js` (constante `SERVICE_ROLE_KEY` / similar). El repositorio `Fqui/Turnitos` es **público**.

**Por qué importa:** la clave `service_role` ignora todas las reglas de seguridad (RLS). Con ella se puede leer, modificar o borrar cualquier tabla y archivo.

**Qué hacer:**
1. **Rotar las claves** en Supabase (Project Settings → API / API Keys). Es lo único que invalida la clave filtrada; borrarla del código no alcanza porque queda en el historial de Git.
2. Actualizar `VITE_SUPABASE_ANON_KEY` en Vercel si cambió, y redeployar.
3. Cambiar los scripts para leer la clave de una variable de entorno (`process.env.SUPABASE_SERVICE_ROLE_KEY`) y **nunca** commitearla.
4. Considerar hacer el repo privado.

## 1. Se puede entrar a cualquier panel sin la contraseña

**Dónde:** `login()` en `src/services/supabase/businessService.js`.

**Qué pasa:** primero intenta `supabase.auth.signInWithPassword`. Si falla (contraseña incorrecta), **igual** busca el negocio por email en la tabla `businesses` y lo devuelve como logueado. Después intenta un `signUp` con la contraseña ingresada, pero el resultado no cambia nada: el login ya se dio por bueno.

**Solución:** el login debe aceptar **solo** si `signInWithPassword` tuvo éxito, y buscar el negocio por `auth_id = user.id`. Para los negocios que todavía no tienen usuario en Supabase Auth, migrarlos una vez desde el panel/servidor (no "on the fly" en el login).

## 2. Super Admin sin contraseña

**Dónde:** `loginSuperAdmin()` en `src/services/supabase/sellerService.js` y `ProtectedSuperAdminRoute.jsx`.

**Qué pasa:**
- Si el email existe en `super_admins` **o es el email del dueño** (escrito en el código), devuelve acceso de super admin **sin mirar la contraseña**.
- La pantalla de "PIN" de `/admin/super` llama a esa función con el email del dueño por defecto, así que **cualquier PIN** desbloquea el panel.

**Solución:** super admin = usuario de Supabase Auth con un rol verificado en la base (por ejemplo, `super_admins.auth_id` o un *custom claim*). Login solo con `signInWithPassword`. Eliminar el email escrito en el código y la pantalla de PIN, o que el PIN sea un segundo factor real verificado en el servidor.

## 3. Visitar la página de un negocio te loguea en su panel

**Dónde:** `src/pages/BusinessProfileRouter.jsx` (guarda el negocio visitado en `localStorage.business`) + `useAuthStore.checkAutoLogin()` (si existe `localStorage.business` con un `id`, entra al panel).

**Qué pasa:** un visitante abre `turnitoslr.com/cualquier-negocio` y después `turnitoslr.com/portal` → queda dentro del panel de ese negocio. También provoca un bug: si un dueño logueado mira la página de otro negocio, su sesión pasa a ser la del otro.

**Solución:** usar otra clave de `localStorage` para el caché público (o no cachear) y que el auto-login dependa **solo** de `supabase.auth.getSession()`.

## 4. La base de datos probablemente está abierta

**Qué se sabe:**
- El navegador usa la clave pública `anon` (es normal: viaja en el JavaScript). La única protección posible es **RLS** (Row Level Security) en cada tabla.
- En el repo no hay políticas RLS para `businesses`, `bookings`, `customers`, `sellers`, `super_admins`, `subscriptions`, etc. Las que sí existen (`reviews`, `promotions`, `store_products`) permiten casi todo (`USING (true)`).
- El propio código público hace cosas que solo funcionan si la base está abierta: la página pública actualiza `businesses.metadata` para sumar el uso de cupones; el listado de la home hace `select('*')` de `businesses` (lo que incluiría la columna `password` si sigue existiendo).

**Cómo verificarlo** (SQL Editor de Supabase):

```sql
-- ¿Qué tablas tienen RLS activado?
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;

-- ¿Qué políticas existen?
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' order by 1;

-- ¿Sigue existiendo la columna password en negocios, vendedores o admins?
select table_name, column_name from information_schema.columns
where table_schema = 'public' and column_name = 'password';
```

Si `rowsecurity` está en `false` para `businesses`, `bookings`, `customers`, `sellers` o `super_admins`, **cualquiera puede leer y escribir esas tablas** (incluidos teléfonos de clientes y contraseñas).

**Solución (por etapas):**
1. Activar RLS en todas las tablas.
2. Lectura pública **solo** de lo necesario (idealmente vía vistas sin columnas sensibles: nada de `password`, `email`, `cbu` si no corresponde).
3. Escritura de cada negocio solo sobre sus filas: `business_id` ligado a `auth.uid()` mediante `businesses.auth_id`.
4. Las reservas públicas, por una función RPC (`SECURITY DEFINER`) que valide disponibilidad, límites y calcule la comisión **en la base**.
5. Panel super admin/vendedor: políticas por rol.

Hacerlo de golpe puede romper pantallas; conviene hacerlo tabla por tabla probando en una rama/preview.

## 5. Contraseñas en texto plano y por defecto

- `businesses.password`, `sellers.password` y `super_admins.password` guardan contraseñas **sin cifrar**. El backup de julio lo confirma.
- La migración de super admins crea `admin@turnitoslr.com` / `superadmin123`.
- El alta por vendedor usa la contraseña temporal fija `admin123`; `seed.js` usa `Turnitos2025!`; `docs/legacy/INSTRUCCIONES_VENUE.md` publica `Quincho2024!`.
- `changeBusinessPassword` compara contra la columna en texto plano.

**Solución:** usar solo Supabase Auth (que guarda las contraseñas cifradas), borrar esas columnas una vez migrados todos los usuarios, eliminar/cambiar las cuentas con contraseñas por defecto y generar contraseñas temporales aleatorias.

## 6. Rutas protegidas solo por `localStorage`

`ProtectedSellerRoute` y `ProtectedSuperAdminRoute` dejan pasar si existe la clave `seller` o `superAdmin` en `localStorage`; cualquiera puede crearla desde la consola del navegador. La protección real tiene que estar en la base (punto 4); en el frontend, validar con `supabase.auth.getSession()` y el rol.

## 7. Lógica de negocio en el navegador

Todo esto corre en el navegador del cliente y se puede saltear:
- Verificación de turnos superpuestos (además puede fallar si dos personas reservan a la vez: no hay restricción única en la base).
- Límite de 100 reservas del plan gratis.
- Cálculo de comisión y origen `marketplace`/`direct`.
- Validación y conteo de usos de cupones.

**Solución:** mover estas reglas a una función de base de datos al crear la reserva, y agregar una restricción que impida reservas superpuestas en el mismo recurso (por ejemplo, una restricción de exclusión sobre `tstzrange(start_time, end_time)`).

## 8. Reseteo de contraseña que no resetea

`resetBusinessPasswordAsSuperAdmin` genera una contraseña temporal y la devuelve para enviar por WhatsApp, **pero no la guarda ni en Supabase Auth ni en la base**. Hoy "funciona" solo porque el login acepta cualquier contraseña (punto 1). **Al corregir el punto 1, el reseteo dejará de funcionar**, así que hay que arreglarlos juntos (el reseteo necesita el Admin API de Supabase, o sea, una función de servidor con la clave `service_role`).

## 9. Menores

- `api/og.js` arma un filtro `.or(...)` concatenando el slug de la URL sin sanitizar (puede alterar el filtro; impacto bajo porque solo lee).
- La configuración de Firebase y la VAPID key están en el código: **es normal** para apps web, no es un problema.
- `src/config/googleSheets.js` tiene la URL pública de un Google Apps Script (código sin uso); si el script sigue publicado con acceso "Anyone", conviene darlo de baja.
- La función `login_business` en la base tiene un error de sintaxis y compara contraseñas en texto plano; borrarla.

---

## Orden sugerido de trabajo

1. **Hoy:** rotar claves de Supabase (punto 0).
2. **Inmediato (un PR chico):** corregir puntos 1, 2, 3 y 8 juntos, probando en un preview de Vercel.
3. **Corto plazo:** verificar RLS (punto 4) y activarlo tabla por tabla; quitar columnas `password` (punto 5).
4. **Mediano plazo:** mover reservas, límites y comisiones a la base (punto 7); push desde servidor.
