# Evaluación de proveedores (UNI) - Prototipo

Prototipo con Next.js 15 + SQLite (better-sqlite3 + drizzle-orm). Permite revisar adjudicaciones de la UNI, consultar experiencia y sanciones DNCP y contrastar evaluaciones internas.

## Funcionalidades
- Listado/búsqueda de proveedores por RUC o razón social
- Historia clínica por proveedor con KPIs: contratos, % cumplimiento de plazos, nota final promedio, satisfacción/calidad, reclamos/reincidencias
- Agregar proveedor, contrato, evaluación (calcula nota final promedio), reclamo, observación técnica
- Ranking de recomendación de proveedores con Laya, usando señales DNCP e historial interno; no determina elegibilidad

## Conexión DNCP

Configura `DNCP_REQUEST_TOKEN` en el entorno del servidor. No incluyas credenciales en el navegador ni en el repositorio. La URL base opcional es `DNCP_API_BASE_URL`; por defecto usa `https://www.contrataciones.gov.py/datos/api/v3/doc`.

## Decisión con Laya

El ranking envía desde el servidor a `POST http://localhost:8000/v1/predict` la información disponible del proveedor, sus evaluaciones, sanciones, reclamos, observaciones, contratos y antecedentes. Se solicita un puntaje numérico de recomendación entre 0 y 100. Puedes cambiar la URL con `LAYA_PREDICT_URL`; si Laya no responde o devuelve un puntaje inválido, la interfaz usa y marca el cálculo local de respaldo.

## Ejecutar
```bash
pnpm install
pnpm dev
```
Abrir http://localhost:3000
