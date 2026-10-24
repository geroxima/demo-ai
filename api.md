
# DNCP Open Data API v3

Base URL: `https://www.contrataciones.gov.py/datos/api/v3/doc`

Documentation: `https://www.contrataciones.gov.py/datos/api/v3/doc/`
Spec: `https://www.contrataciones.gov.py/datos/api/v3/doc/swagger.json`

## Authentication

All endpoints require the access token in the `Authorization` header. Send the raw token, with no `Bearer` prefix.

```
Authorization: [access_token]
```

To get an access token:

1. Register at `https://www.contrataciones.gov.py/datos/adm/login`.
2. Create an application. The portal gives you a customer key, a customer secret, and a request token.
3. Send the request token to `POST /oauth/token`.
4. The response contains the access token.

The access token lasts 15 minutes. After that, request a new one. Without an OAuth key, the API allows 15 calls per minute. This limit is for testing.

## Limits

List endpoints return at most 10,000 records. Use `page` and `items_per_page` to page through results. For bulk data, download the CSV files at `https://www.contrataciones.gov.py/datos/data`.

## Request and response format

The API consumes and produces `application/json`. Most endpoints are GET requests with no body. Only `POST /oauth/token` has a body.

## Response codes

| Code | Meaning |
|---|---|
| `200` | OK |
| `400` | Invalid Argument |
| `404` | Not Found (some endpoints) |
| `500` | Mapping Key Error |

---

## 1. Authentication

### `POST /oauth/token`

Returns an access token for the other endpoints.

Request body:

```json
{
  "request_token": "..."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `request_token` | string | yes | The request token of the application |

---

## 2. Search

### `GET /search/processes`

Searches procurement processes by OCDS fields. The response is a minimal OCDS record package. It contains the main tender data and the IDs of the later stages. Use these IDs with the other endpoints to get the complete data.

Text fields use exact-term matching. The API applies all filters together. The examples below are not the full list. You can search by any field of the OCDS standard.

| Query parameter | Description |
|---|---|
| `ocid` | Tender number |
| `tender.title` | Tender name |
| `tender.statusDetails` | Tender stage |
| `tender.mainProcurementCategory` | Category. Zero or more, separated by commas |
| `tender.procurementMethodDetails` | Procedure type. Zero or more, separated by commas |
| `tender.procurementMethodRationale` | Reason for the procurement method. For example `covid-19` |
| `tender.coveredBy` | Legal features: `covid_19`, `fonacide`, `agricultura_familiar`, and more |
| `tender.procuringEntity.name` | Procuring entity name |
| `tender.items.classification.id` | Level 4 catalog code of the tender items. Zero or more, separated by commas |
| `awards.suppliers.name` | Business name of the awarded supplier |
| `awards.suppliers.id` | RUC of the awarded supplier |
| `awards.items.classification.id` | Level 4 catalog code of the awarded items. Zero or more, separated by commas |
| `contracts.id` | Contract code |
| `contracts.statusDetails` | Contract status |
| `parties.identifier.id` | SICP code of the procuring entity |
| `parties.details.categories.id` | Supplier categories |
| `parties.details.scale` | Mipyme category of the supplier |
| `parties.details.entityType` | Entity type |
| `planning.budget.budgetBreakdown.classifications.fuente_financiamiento` | Funding source type |
| `planning.budget.budgetBreakdown.classifications.anio` | Budget line year |
| `planning.investmentProjects.id` | Planned SNIP code |
| `contracts.investmentProjects.id` | Contract SNIP code |
| `contracts.implementation.financialProgress.breakdown.classifications.anio` | Budget line year |
| `contracts.implementation.financialProgress.breakdown.classifications.nivel` | Entity level of the budget line |
| `contracts.implementation.financialProgress.breakdown.classifications.entidad` | Entity of the budget line |
| `contracts.implementation.financialProgress.breakdown.classifications.tipo_programa` | Program type of the budget line |
| `contracts.implementation.financialProgress.breakdown.classifications.programa` | Program of the budget line |
| `contracts.implementation.financialProgress.breakdown.classifications.sub_programa` | Subprogram of the budget line |
| `contracts.implementation.financialProgress.breakdown.classifications.proyecto` | Project of the budget line |
| `contracts.implementation.financialProgress.breakdown.classifications.objeto_gasto` | Expenditure object of the budget line |
| `contracts.implementation.financialProgress.breakdown.classifications.fuente_financiamiento` | Funding source of the budget line |
| `contracts.implementation.financialProgress.breakdown.classifications.financiador` | Financier of the budget line |
| `contracts.implementation.financialProgress.breakdown.classifications.departamento` | Department of the budget line |
| `fecha_desde` | Start date |
| `fecha_hasta` | End date |
| `tipo_fecha` | Date type: `entrega_ofertas`, `adjudicacion`, `publicacion_llamado`, `firma_contrato`, `fecha_release` |
| `procedimiento` | Can be `precalificacion`, `convenio_marco`, or `subasta` |
| `order` | Sort field plus direction. Default: `date desc` |
| `page` | Page |
| `items_per_page` | Page size |

### `GET /search/suppliers`

Searches suppliers.

| Query parameter | Description |
|---|---|
| `identifier.id` | RUC of the supplier |
| `name` | Supplier name |
| `details.categories.id` | Categories of the supplier. Zero or more, separated by commas |
| `details.size` | Company size |
| `details.sanctions.type` | Sanction type: `AMONESTACION`, `INHABILITACION`, or both, separated by commas |
| `page` | Page |
| `items_per_page` | Page size |

### `GET /search/procuringEntities`

Searches procuring entities (convocantes).

| Query parameter | Description |
|---|---|
| `identifier.id` | SICP code of the entity |
| `name` | Entity name |
| `details.level` | Entity level. For example `Universidades Nacionales` |
| `details.entityType` | Entity type. For example `Entidades Descentralizadas` |
| `details.type` | Type. For example `Unidad Contratación` |
| `memberOf.id` | SICP code of the parent entity |
| `page` | Page |
| `items_per_page` | Page size |

### `GET /search/procurementIntentions`

Searches exception intentions with ex-post disclosure (Intenciones de Excepcion con Difusion Posterior).

| Query parameter | Description |
|---|---|
| `procuringEntity.id` | SICP code of the procuring entity |
| `procuringEntity.name` | Procuring entity name |
| `id` | Slug |
| `relatedProcesses.id` | ID of the related tender |
| `relatedProcesses.status` | Status of the related tender: `active` or `complete` |
| `page` | Page |
| `items_per_page` | Page size |

### `GET /search/classification`

Searches level 5 catalog products.

| Query parameter | Description |
|---|---|
| `id` | Product code |
| `name` | Product name |
| `categories.id` | Category to search |
| `page` | Page |
| `items_per_page` | Page size |

### `GET /search/awarded-items/{codigo}/amount/{anio}`

Searches awarded items by level 4 catalog code and award year.

| Parameter | In | Description |
|---|---|---|
| `codigo` | path | Level 4 catalog code |
| `anio` | path | Award year |
| `page` | query | Page |
| `items_per_page` | query | Page size |

---

## 3. Single record lookups

Most of these endpoints accept an optional `sections` query parameter. It takes a comma-separated list of OCDS parts. Example: `id,suppliers,date`.

### `GET /tender/{id}`

Returns one tender (licitación).

| Parameter | In | Required | Description |
|---|---|---|---|
| `id` | path | yes | Tender ID. Example: `361490-adquisicion-materiales-e-insumos-limpieza-1` |
| `sections` | query | no | OCDS parts, separated by commas |

### `GET /awards/{id}`

Returns one award (adjudicación).

| Parameter | In | Required | Description |
|---|---|---|---|
| `id` | path | yes | Award ID. Example: `365292-regularizacion-asfaltica-avda-santa-teresa-mcal-lopez-juan-e-o-leary-1` |
| `sections` | query | no | OCDS parts, separated by commas. Example: `id,suppliers,date` |

### `GET /contracts/{id}`

Returns one contract.

| Parameter | In | Required | Description |
|---|---|---|---|
| `id` | path | yes | Contract code. Example: `LC-12006-19-170106` |
| `sections` | query | no | OCDS parts, separated by commas |

### `GET /complaints/{id}`

Returns one complaint (protesta).

| Parameter | In | Required | Description |
|---|---|---|---|
| `id` | path | yes | Complaint ID |
| `sections` | query | no | OCDS parts, separated by commas |

### `GET /planning/{id}`

Returns one planning record.

| Parameter | In | Required | Description |
|---|---|---|---|
| `id` | path | yes | Planning ID. Example: `361490` |
| `sections` | query | no | OCDS parts, separated by commas |

### `GET /procurementIntention/{id}`

Returns one exception intention.

| Parameter | In | Required | Description |
|---|---|---|---|
| `id` | path | yes | Slug. Example: `1-reparacion-puente-barrio-san-roque-capiata` |

### `GET /procuringEntities/{id}`

Returns one procuring entity (convocante).

| Parameter | In | Required | Description |
|---|---|---|---|
| `id` | path | yes | SICP number. Example: `179` |

### `GET /suppliers/{id}`

Returns one supplier (proveedor).

| Parameter | In | Required | Description |
|---|---|---|---|
| `id` | path | yes | RUC. Example: `1022971-0` |

---

## 4. OCDS

### `GET /ocds/record/{ocid}`

Returns one OCDS record. The OCID is the prefix `ocds-03ad3f-` plus the process number. Example: `ocds-03ad3f-365292-1`.

| Parameter | In | Required | Description |
|---|---|---|---|
| `ocid` | path | yes | OCID to search |

### `GET /ocds/releases/id/{id}`

Returns one release by its ID.

| Parameter | In | Required | Description |
|---|---|---|---|
| `id` | path | yes | Release ID |

### `GET /ocds/releases/ocid/{ocid}`

Returns all releases for one OCID.

| Parameter | In | Required | Description |
|---|---|---|---|
| `ocid` | path | yes | OCID. Example: `ocds-03ad3f-365292-1` |
| `page` | query | no | Page |
| `items_per_page` | query | no | Page size |

---

## 5. Parameters

### `GET /parameters/parameters`

Lists parameters.

| Query parameter | Description |
|---|---|
| `domain` | Domain |
| `page` | Page |
| `items_per_page` | Page size |

### `GET /parameters/procurementCategories`

Lists procurement categories.

| Query parameter | Description |
|---|---|
| `page` | Page |
| `items_per_page` | Page size |

### `GET /parameters/procurementMethods`

Lists procurement methods (modalidades).

| Query parameter | Description |
|---|---|
| `page` | Page |
| `items_per_page` | Page size |

---

## 6. Catalog (item classification)

### `GET /itemClassification/n4/{id}`

Returns one level 4 product.

| Parameter | In | Required | Description |
|---|---|---|---|
| `id` | path | yes | Product ID |

### `GET /itemClassification/n4/{id}/n5`

Lists level 5 products under one level 4 product.

| Parameter | In | Required | Description |
|---|---|---|---|
| `id` | path | yes | Level 4 product ID |
| `page` | query | no | Page |
| `items_per_page` | query | no | Page size |

### `GET /itemClassification/n5/{id}`

Returns one level 5 product.

| Parameter | In | Required | Description |
|---|---|---|---|
| `id` | path | yes | Product ID |

### `GET /itemClassification/n5/{id}/expenditure_object`

Lists expenditure objects for one level 5 product.

| Parameter | In | Required | Description |
|---|---|---|---|
| `id` | path | yes | Level 5 product ID |
| `page` | query | no | Page |
| `items_per_page` | query | no | Page size |

---

## 7. Visualizations

These endpoints return summary data for visualizations.

### `GET /visualizations/minimal/tenders`

Lists open tenders.

| Query parameter | Description |
|---|---|
| `mainProcurementCategoryDetails` | Category |
| `procurementMethodDetails` | Procedure type |
| `buyer` | Institution |
| `tenderPeriod_from` | Start date of the bid opening |
| `tenderPeriod_until` | End date of the bid opening |

### `GET /visualizations/minimal/tenders/count`

Counts open tenders. It accepts the same filters as `GET /visualizations/minimal/tenders`.

### `GET /visualizations/minimal/compiledRelease/{id}`

Returns summary data for one tender. The spec declares both a path parameter `id` and a query parameter `ocid`. The description says it takes the tender ID. Test both to find which one works.

| Parameter | In | Description |
|---|---|---|
| `id` | path | Tender ID. Example: `365292` |
| `ocid` | query | Tender ID. Example: `365292` |

### `GET /visualizations/minimal/contract/buyer/{buyer_id}/year/{year}`

Lists contracts for one entity in one year.

| Parameter | In | Required | Description |
|---|---|---|---|
| `buyer_id` | path | yes | SICP code of the entity |
| `year` | path | yes | Year of the contract |

### `GET /visualizations/minimal/contract/buyer/level/{buyer_level}/year/{year}`

Counts contracts by entity level and year.

| Parameter | In | Required | Description |
|---|---|---|---|
| `buyer_level` | path | yes | Entity level |
| `year` | path | yes | Year of the contract |
