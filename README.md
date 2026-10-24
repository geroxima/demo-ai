# Evaluación de proveedores (UNI) - Prototipo

Prototipo con Next.js 15 + SQLite (better-sqlite3 + drizzle-orm). Permite revisar adjudicaciones de la UNI, consultar experiencia y sanciones DNCP y contrastar evaluaciones internas.

## Funcionalidades
- Listado/búsqueda de proveedores por RUC o razón social
- Historia clínica por proveedor con KPIs: contratos, % cumplimiento de plazos, nota final promedio, satisfacción/calidad, reclamos/reincidencias
- Agregar proveedor, contrato, evaluación (calcula nota final promedio), reclamo, observación técnica
- Ranking demostrativo con señales DNCP e historial interno; no determina elegibilidad

## Conexión DNCP

Configura `DNCP_REQUEST_TOKEN` en el entorno del servidor. No incluyas credenciales en el navegador ni en el repositorio. La URL base opcional es `DNCP_API_BASE_URL`; por defecto usa `https://www.contrataciones.gov.py/datos/api/v3/doc`.

## Ejecutar
```bash
pnpm install
pnpm dev
```
Abrir http://localhost:3000
