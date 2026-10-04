-- ============================================
-- FIX: Corregir horarios de Spa Zen
-- Problema: close del primer turno está en 21:00, debería ser 13:00
-- Esto causa que se muestren slots en horario de siesta (13:00-17:00)
-- Solución: Actualizar a horarios correctos con descanso de 13:00-17:00
-- ============================================

-- Primero, ver el horario actual (para confirmar el problema)
SELECT id, name, hours
FROM businesses
WHERE id = 'spa-zen';

-- Actualizar con horarios correctos
UPDATE businesses
SET hours = jsonb_build_object(
    'monday', jsonb_build_object(
        'isOpen', true,
        'isSplit', true,
        'open', '10:00',
        'close', '13:00',      -- ✅ CORREGIDO: era 21:00
        'open2', '17:00',
        'close2', '21:00'
    ),
    'tuesday', jsonb_build_object(
        'isOpen', true,
        'isSplit', true,
        'open', '10:00',
        'close', '13:00',      -- ✅ CORREGIDO: era 21:00
        'open2', '17:00',
        'close2', '21:00'
    ),
    'wednesday', jsonb_build_object(
        'isOpen', true,
        'isSplit', true,
        'open', '10:00',
        'close', '13:00',      -- ✅ CORREGIDO: era 21:00
        'open2', '17:00',
        'close2', '21:00'
    ),
    'thursday', jsonb_build_object(
        'isOpen', true,
        'isSplit', true,
        'open', '10:00',
        'close', '13:00',      -- ✅ CORREGIDO: era 21:00
        'open2', '17:00',
        'close2', '21:00'
    ),
    'friday', jsonb_build_object(
        'isOpen', true,
        'isSplit', true,
        'open', '10:00',
        'close', '13:00',      -- ✅ CORREGIDO: era 21:00
        'open2', '17:00',
        'close2', '21:00'
    ),
    'saturday', jsonb_build_object(
        'isOpen', true,
        'isSplit', true,
        'open', '10:00',
        'close', '13:00',      -- ✅ CORREGIDO: era 21:00
        'open2', '17:00',
        'close2', '21:00'
    ),
    'sunday', jsonb_build_object(
        'isOpen', false
    )
)
WHERE id = 'spa-zen';

-- Verificar el cambio
SELECT id, name, hours
FROM businesses
WHERE id = 'spa-zen';
