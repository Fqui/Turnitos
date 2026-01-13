# Scripts de Sembrado de Datos

Esta carpeta contiene todos los scripts SQL para sembrar datos de prueba en la base de datos.

## Orden de Ejecución

### Categoría: BELLEZA

1. **01_belleza_subcategories.sql** - Crear subcategorías (Estética, Peluquería, Spa, Manicura)
2. **02_belleza_businesses.sql** - Crear 8 negocios con servicios y especialistas

## Contenido del Sembrado

### Belleza (8 negocios)
- **Estética** (2): Estética Integral, Belleza Natural
- **Peluquería** (2): Peluquería Estilo, Salón Glamour
- **Spa** (2): Spa Relax, Spa Zen
- **Manicura** (2): Nails Art Studio, Beauty Nails

**Total:**
- 8 negocios
- 20 especialistas
- 37 servicios
- Imágenes de Unsplash
- Horarios variados
- Suscripciones activas

## Próximas Categorías

- [ ] Deportes (Pádel, Fútbol)
- [ ] Salud (Kinesiología, Nutrición, Psicología)
- [ ] Alquileres (Salones, Quinchos)
- [ ] Mascotas (Veterinarias, Peluquería Canina)

## Notas

- Todos los scripts usan `ON CONFLICT DO NOTHING` para evitar duplicados
- Las contraseñas son simples para testing (ej: `estetica123`)
- Los emails siguen el patrón: `[nombre]@turnitos.com`
