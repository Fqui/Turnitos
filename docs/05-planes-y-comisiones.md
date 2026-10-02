# 5. Planes, precios y comisiones

## Dónde están definidos

Los precios aparecen en **cuatro lugares distintos**, que hoy no coinciden entre sí:

| Lugar | Qué define | ¿Se usa? |
|---|---|---|
| `src/utils/subscriptionUtils.js` (`PLANS_CATALOG`, `calculateMonthlyFee`, `calculateBookingCommission`) | Planes, precio mensual y comisión por reserva | **Sí**: la comisión de cada reserva se calcula acá |
| `src/components/business/BusinessSubscriptionView.jsx` | Precio que ve el negocio en "Suscripción" | Sí (números escritos a mano) |
| `src/components/seller/BusinessFormModal.jsx` | Precio que muestra el alta de negocios | Sí (números escritos a mano) |
| Tabla `subscription_plans` en Supabase | Planes que listan los formularios de alta y los ajustes | Sí, pero con IDs UUID y precios de una etapa anterior (la migración carga 15.000 / 25.000 / 30.000…) |

**Recomendación:** dejar **una sola fuente** (idealmente la tabla `subscription_plans`, para poder cambiar precios sin tocar código) y que todas las pantallas lean de ahí.

## Lo que hace el código hoy

### Suscripción mensual

| Plan (código) | Rubro | Precio mensual en el código |
|---|---|---|
| `free` — Plan Gratis | Todos | $0, hasta **100 reservas online por mes**, sin subdominio, link in bio ni tienda |
| `services_individual` | Servicios | **$18.000** (1 profesional) |
| `services_team` | Servicios | **$36.000** hasta 3 profesionales, **+$10.000** por cada uno desde el 4.º |
| `courts_1_3` | Canchas | **$20.000 por cancha** (1 a 3) |
| `courts_4_5` | Canchas | **$17.000 por cancha** (4 a 5) |
| `courts_6_plus` | Canchas | **$15.000 por cancha** (6 o más) |
| `rental` | Alquileres | **$15.000** fijo |

Además, la base tiene un período de **prueba de 15 días** (`trial_start_date`, `trial_end_date`, `subscription_status = 'trial'`).

### Comisión por reserva (`calculateBookingCommission`)

| Situación | Comisión |
|---|---|
| Plan gratis | **5 %** del precio, en cualquier reserva |
| Plan pago, reserva **directa** (link propio, subdominio, link in bio) | $0 |
| Plan pago, reserva desde el **marketplace**, servicios o canchas | **$500** fijos |
| Plan pago, reserva desde el **marketplace**, alquileres | **3 %** del total |

La comisión se guarda en `bookings.metadata.commission_amount`. **No se cobra automáticamente**: es un registro para liquidar después.

### Comisión de vendedores (`calculateCommission` en `sellerService.js`)

Se calcula por cada pago de suscripción registrado en `subscription_payments`:

| Mes de suscripción del negocio | % de la cuota para el vendedor |
|---|---|
| 1 | 40 % |
| 2 | 30 % |
| 3 | 20 % |
| 4 a 6 | 10 % |
| 7 en adelante | 0 % |
| Bonus | +5 % si el vendedor tiene 50 o más negocios activos |

Esto mismo se publica en la página pública `/colaboradores`.

## Diferencias con el modelo comercial definido

El modelo que definiste para TurnitosLR difiere del código en varios puntos. Hasta que se actualice el código, **lo que ven y pagan los negocios y vendedores es lo del código**.

| Tema | Modelo definido | Código actual |
|---|---|---|
| Servicios, agenda individual | $17.000 | $18.000 |
| Servicios, agenda de equipo (3) | $35.000 | $36.000 |
| Canchas | $17.000 c/u; con más de 3 canchas, $15.000 c/u | $20.000 c/u (1–3), $17.000 (4–5), $15.000 (6+) |
| Alquiler, espacio individual | $15.000 | $15.000 ✅ |
| Comisión marketplace servicios/canchas | $500 | $500 ✅ |
| Comisión marketplace alquileres | 3 % | 3 % ✅ |
| Reservas por la página propia del negocio | Sin comisión | Sin comisión ✅ (salvo plan gratis: 5 %) |
| Cobro desde el primer mes | Sí | Existe prueba de 15 días y un **plan gratis** |
| Vendedor (quien suma negocios) | 30 % de la suscripción + $50.000 cada 50 negocios sumados | 40/30/20/10 % decreciente hasta el mes 6 + 5 % extra con 50 activos |

Para alinear el código hay que tocar: `subscriptionUtils.js`, `BusinessSubscriptionView.jsx`, `BusinessFormModal.jsx`, la tabla `subscription_plans`, `calculateCommission` (vendedores), los textos de `/colaboradores` y `/negocios`, y decidir qué pasa con el plan gratis y la prueba.

## Debilidades del esquema actual

- **La comisión la calcula el navegador del cliente** y el origen "marketplace" sale de `sessionStorage`: cualquiera puede alterarlo, y si alguien entra a la home y después al link propio del negocio en la misma pestaña, queda marcado como marketplace.
- **El límite de 100 reservas del plan gratis** también se controla en el navegador.
- La detección de "plan gratis" compara el ID del plan con el texto `free`/`gratis`, pero `businesses.subscription_plan_id` está definido como UUID en las migraciones. Hay que verificar qué valor tienen los negocios gratuitos en la base real.
- Todo esto debería moverse a la base de datos (un trigger o función al insertar la reserva) para que no dependa del cliente.
