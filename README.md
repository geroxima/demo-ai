# 🏛️ Sistema Inteligente de Evaluación y Registro de Proveedores (UNI)
## Integrantes:
- Oscar Lezcano, Univ. Ingeniería Informática (FIUNI)
- Adán Alvarez, Univ. Ingeniería Informática (FIUNI)
- Christopher Mendoza, Univ. Ingeniería Informática (FIUNI)

Este proyecto es una solución integral diseñada para la Universidad Nacional de Itapúa (UNI) que resuelve la necesidad de evaluar, recomendar y registrar el desempeño histórico de los proveedores. 

La plataforma fusiona **información interna cualitativa** (creada por los trabajadores de la UNI) con **datos públicos oficiales** provenientes de la Dirección Nacional de Contrataciones Públicas (DNCP). Esto permite generar recomendaciones fundamentadas y explicables utilizando modelos de Inteligencia Artificial.

---

## 🎯 Desafíos Resueltos

Este proyecto da solución directa a los **Desafíos 5 y 6** establecidos para la optimización de adquisiciones.

### Desafío 5: Sistema Inteligente de Evaluación y Recomendación
Cumplir con los requisitos formales no siempre garantiza que el proveedor sea el más apto para el problema real.
* **Solución:** Un sistema de evaluación multicriterio impulsado por un modelo de decisión IA.
* **Variables analizadas:** Adecuación técnica, tiempo de respuesta, costo, experiencia previa, cumplimiento contractual, calidad real de servicios anteriores, soporte y capacidad de resolución.
* **Resultado:** Un ranking **explicable**, indicando los motivos precisos por los cuales un proveedor obtiene mayor puntuación, conformando una matriz inteligente adaptable a distintos procesos de adquisición.

### Desafío 6: Historial Inteligente ("Historia Clínica" del Proveedor)
La experiencia de contratos pasados suele quedar dispersa o perderse entre dependencias.
* **Solución:** Una base de datos institucional centralizada que funciona como un registro histórico del desempeño.
* **Métricas registradas:** Contratos ejecutados (contrastados con DNCP), tiempos de entrega, cumplimiento de plazos, calidad, reclamos/quejas, observaciones técnicas, grado de satisfacción interno, reincidencias y evaluación final.
* **Resultado:** Una vista 360º del proveedor para tomar decisiones futuras con memoria institucional.

---

## ⚙️ Flujo de Trabajo y Procesamiento de Datos

Para lograr recomendaciones precisas, el sistema ejecuta el siguiente flujo automatizado:

1. **Recolección de Licitaciones:** Búsqueda de licitaciones cerradas adjudicadas por la UNI.
2. **Extracción de Proveedores:** Análisis de la licitación para obtener información detallada del proveedor (ej. RUC).
3. **Investigación de Antecedentes:** Consulta de amonestaciones, quejas o sanciones previas del proveedor en el historial público.
4. **Cruce de Datos (Fusión):** Intersección de la data pública de la DNCP con el historial inteligente (feedback interno) recopilado en el sistema (Desafío 6).
5. **Inferencia de IA (Laya):** Toda la data procesada se envía a nuestro motor de IA, el cual genera un ranking explicable y recomienda las mejores opciones basándose en el historial completo.

---

## 🔌 Integración de Datos (API DNCP)

El sistema se nutre directamente de la [API Pública de la DNCP v3](https://www.contrataciones.gov.py/datos/api/v3/doc/). Algunos de los endpoints críticos utilizados incluyen:

* **Licitaciones Adjudicadas (UNI):**  
  `GET /search/processes?parties.identifier.id=237&tipo_fecha=publicacion_llamado&tender.statusDetails=Adjudicada...`
* **Información de la Licitación (Extracción de RUC):**  
  `GET /tender/{id_licitacion}`
* **Historial de Amonestaciones del Proveedor:**  
  `GET /suppliers/{ruc}`

---

## 🛠️ Tecnologías y Arquitectura

El proyecto está construido sobre una arquitectura moderna, separando la interfaz de usuario del motor de procesamiento de Inteligencia Artificial.

### Frontend
* **[Next.js](https://nextjs.org/):** Framework de React utilizado para construir una interfaz de usuario rápida, reactiva y amigable para los funcionarios de la UNI.

### Motor de IA / Backend
El sistema de recomendación y evaluación corre en un servidor local basado en Python que expone una API rápida y segura.
* **Laya:** Framework principal para la orquestación del modelo de decisión IA.
* **FastAPI:** Para la creación de endpoints robustos y de alto rendimiento.
* **Pydantic:** Para la validación y estructuración de los datos.
* **Asyncio:** Para manejar concurrencia en las peticiones a la DNCP.

> **⚠️ Importante:** El servicio de Inteligencia Artificial se nutre de un servidor Laya independiente. Puedes encontrar el código fuente, la configuración y el despliegue del motor de IA en el siguiente repositorio:
> 🔗 **[Repositorio Laya Server (BuildNight_LayaServer)](https://github.com/MrChrisFabian/BuildNight_LayaServer)**

---

## 🚀 Cómo Empezar (Próximamente)
*(Instrucciones de instalación del cliente Next.js y conexión con el servidor Laya. Ej: `npm install`, configurar variables de entorno con los tokens de DNCP, y `npm run dev`)*
