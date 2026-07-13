# Backups de la base de datos de TurnitosLR

## Carpetas

- `full-reset-2026-07-12/` — Backup completo pre-reset del 12 de julio de 2026
- `snapshot-pre-reset/` — Copia exacta de `full-reset-2026-07-12/` (sin timestamp, snapshot final)

## Contenido

Cada archivo `.json` es la exportación completa de una tabla vía PostgREST:

| Archivo | Tabla | Filas (al momento del backup) |
|---|---|---|
| businesses-*.json | businesses | 37 |
| bookings-*.json | bookings | 24 |
| customers-*.json | customers | 19 |
| resources-*.json | resources | 15 |
| specialists-*.json | specialists | 47 |
| categories-*.json | categories | 5 (catálogo) |
| subcategories-*.json | subcategories | 16 (catálogo) |
| amenities-*.json | amenities | 39 (catálogo) |
| subscription_plans-*.json | subscription_plans | 10 (catálogo) |
| super_admins-*.json | super_admins | 1 (admin) |
| business_subcategories-*.json | business_subcategories | N |
| business_amenities-*.json | business_amenities | N |
| subscriptions-*.json | subscriptions | N |
| subscription_payments-*.json | subscription_payments | 0 |
| sellers-*.json | sellers | 1 |
| seller_commissions-*.json | seller_commissions | 0 |
| push_subscriptions-*.json | push_subscriptions | 0 |
| promotions-*.json | promotions | 3 |
| locations-*.json | locations | tabla no existe en este proyecto |

## Cómo restaurar (si hace falta)

Los archivos están en formato PostgREST. Para restaurar:

```bash
# Ejemplo: restaurar businesses
cat businesses-20260712_210100.json | jq -c '.[]' | while read row; do
  curl -X POST \
    -H "apikey: $SUPABASE_TURNITOS_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_TURNITOS_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "$row" \
    https://pjtakqbegttsazhkcsmv.supabase.co/rest/v1/businesses
done
```

## Notas

- **Los URLs de imágenes (logo_url, banner_url, gallery_images) son placeholders** de placehold.co — no son contenido real
- Los passwords están **en plano** en el backup (problema de seguridad pre-existente)
- El campo `id` es el original de cada registro — si lo restaurás en una DB vacía, mantiene los mismos IDs
