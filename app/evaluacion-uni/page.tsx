/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contratos, evaluaciones, reclamos } from "@/lib/schema";
import { addAwardExperience } from "./actions";
import {
  fetchSupplier,
  fetchTenderDetails,
  searchProcessesBySupplier,
  searchUniAwardedProcesses,
} from "@/lib/api";

export const dynamic = "force-dynamic";

const DATE_DEFAULT = "2025-01-01";

function releaseOf(record: any) {
  return record?.compiledRelease || record?.release || record;
}

function tenderIdOf(record: any) {
  const release = releaseOf(record);
  return String(release?.tender?.id || record?.tender?.id || "");
}

function recordKey(record: any) {
  return (
    tenderIdOf(record) ||
    String(record?.ocid || releaseOf(record)?.ocid || record?.id || "")
  );
}

function tenderOf(record: any) {
  return releaseOf(record)?.tender || record?.tender || {};
}

function awardsOf(record: any) {
  const release = releaseOf(record);
  return release?.awards || record?.awards || [];
}

function contractsOf(record: any) {
  const release = releaseOf(record);
  return release?.contracts || record?.contracts || [];
}

function awardedSuppliers(record: any) {
  const suppliers = awardsOf(record).flatMap(
    (award: any) => award?.suppliers || [],
  );
  const unique = new Map<string, { ruc: string; name: string }>();
  for (const supplier of suppliers) {
    const ruc = String(supplier?.identifier?.id || supplier?.id || "").trim();
    if (!ruc) continue;
    unique.set(ruc, {
      ruc,
      name: supplier?.name || supplier?.identifier?.legalName || ruc,
    });
  }
  return [...unique.values()];
}

function dateOf(record: any) {
  const awardDate = awardsOf(record).find((award: any) => award?.date)?.date;
  return String(
    awardDate ||
      releaseOf(record)?.date ||
      tenderOf(record)?.datePublished ||
      "",
  ).slice(0, 10);
}

function amountOf(record: any) {
  const award = awardsOf(record)[0];
  return award?.value?.amount ?? tenderOf(record)?.value?.amount ?? null;
}

function experienceOf(primary: any, fallback: any, ruc: string) {
  const records = [primary, fallback].filter(Boolean);
  const award = records
    .flatMap(awardsOf)
    .find((item: any) =>
      (item?.suppliers || []).some(
        (supplier: any) =>
          String(supplier?.identifier?.id || supplier?.id || "").trim() === ruc,
      ),
    );
  const contractsFromApi = records.flatMap(contractsOf);
  const contract =
    contractsFromApi.find(
      (item: any) =>
        award?.id &&
        String(item?.awardID || item?.awardId || "") === String(award.id),
    ) || (contractsFromApi.length === 1 ? contractsFromApi[0] : null);
  const tender = records.map(tenderOf).find((item: any) => item?.title) || {};
  const ocid = String(
    records
      .map((record) => record?.ocid || releaseOf(record)?.ocid)
      .find(Boolean) || recordKey(fallback || primary),
  );
  const awardId = String(award?.id || "");

  return {
    id: String(contract?.id || `DNCP-${ocid}-${awardId || ruc}`),
    ocid,
    title: String(tender.title || tender.id || "Adjudicación DNCP"),
    buyer: String(tender.procuringEntity?.name || ""),
    object: String(tender.description || tender.title || ""),
    dateSigned: String(contract?.dateSigned || "").slice(0, 10),
    amount: contract?.value?.amount ?? award?.value?.amount ?? null,
    currency: String(
      contract?.value?.currency || award?.value?.currency || "PYG",
    ),
    status: String(
      contract?.statusDetails ||
        contract?.status ||
        tender.statusDetails ||
        "Adjudicada",
    ),
  };
}

function money(amount: unknown, currency = "PYG") {
  if (typeof amount !== "number") return "Monto no informado";
  try {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("es-PY")} ${currency}`;
  }
}

function supplierProfile(data: any) {
  return data?.supplier || data?.suppliers?.[0] || data?.list?.[0] || data;
}

function sanctionsOf(profile: any) {
  const raw = profile?.details?.sanctions ?? profile?.sanctions;
  if (Array.isArray(raw)) return { known: true, items: raw };
  if (Array.isArray(raw?.list)) return { known: true, items: raw.list };
  if (raw && typeof raw === "object" && raw.type)
    return { known: true, items: [raw] };
  return { known: false, items: [] as any[] };
}

function rankLabel(score: number | null) {
  if (score === null) return "Datos insuficientes";
  if (score >= 80) return "Mejor posición simulada";
  if (score >= 60) return "Revisión adicional";
  return "Señales de riesgo";
}

async function assessSupplier(
  supplier: { ruc: string; name: string },
  current: any,
) {
  const [profileResult, experienceResult] = await Promise.allSettled([
    fetchSupplier(supplier.ruc),
    searchProcessesBySupplier(supplier.ruc, 100),
  ]);

  const profile =
    profileResult.status === "fulfilled"
      ? supplierProfile(profileResult.value)
      : null;
  const sanctions = profile
    ? sanctionsOf(profile)
    : { known: false, items: [] as any[] };
  const sanctionTypes = sanctions.items.map((item: any) =>
    String(item?.type || item?.status || "").toUpperCase(),
  );
  const warnings = sanctionTypes.filter((type: string) =>
    type.includes("AMONESTACION"),
  ).length;
  const disqualifications = sanctionTypes.filter((type: string) =>
    type.includes("INHABILITACION"),
  ).length;

  const currentOcid = String(current?.ocid || releaseOf(current)?.ocid || "");
  const currentTenderId = tenderIdOf(current);
  const pastRecords =
    experienceResult.status === "fulfilled"
      ? [
          ...new Map(
            experienceResult.value
              .filter((record: any) => {
                const key = String(
                  record?.ocid || releaseOf(record)?.ocid || "",
                );
                const sameOcid = currentOcid && key === currentOcid;
                const sameTender =
                  currentTenderId && tenderIdOf(record) === currentTenderId;
                return !sameOcid && !sameTender;
              })
              .map((record: any) => [
                record?.ocid || recordKey(record),
                record,
              ]),
          ).values(),
        ]
      : [];

  const savedEvals = db
    .select()
    .from(evaluaciones)
    .where(eq(evaluaciones.proveedorRuc, supplier.ruc))
    .all();
  const openClaims = db
    .select()
    .from(reclamos)
    .where(
      and(
        eq(reclamos.proveedorRuc, supplier.ruc),
        eq(reclamos.resuelto, false),
      ),
    )
    .all();
  const evaluationValues = savedEvals
    .flatMap((evaluation) => [
      evaluation.calidad,
      evaluation.cumplimientoPlazos,
      evaluation.gradoSatisfaccion,
    ])
    .filter((value): value is number => typeof value === "number");
  const d6Average = evaluationValues.length
    ? evaluationValues.reduce((sum, value) => sum + value, 0) /
      evaluationValues.length
    : null;

  const parts: Array<{ points: number; max: number }> = [];
  if (experienceResult.status === "fulfilled") {
    parts.push({ points: Math.min(40, pastRecords.length * 4), max: 40 });
  }
  if (d6Average !== null) parts.push({ points: (d6Average / 5) * 30, max: 30 });
  if (sanctions.known) {
    parts.push({
      points: Math.max(0, 30 - warnings * 8 - disqualifications * 30),
      max: 30,
    });
  }
  const maxPoints = parts.reduce((sum, part) => sum + part.max, 0);
  const score = maxPoints
    ? Math.round(
        (parts.reduce((sum, part) => sum + part.points, 0) / maxPoints) * 100,
      )
    : null;

  return {
    ...supplier,
    score,
    label: rankLabel(score),
    evidenceCount: parts.length,
    priorAwards:
      experienceResult.status === "fulfilled" ? pastRecords.length : null,
    d6Average,
    openClaims: openClaims.length,
    sanctionsKnown: sanctions.known,
    warnings,
    disqualifications,
  };
}

function queryHref(
  params: { from: string; until: string; q: string },
  process?: string,
) {
  const search = new URLSearchParams();
  search.set("from", params.from);
  if (params.until) search.set("until", params.until);
  if (params.q) search.set("q", params.q);
  if (process) search.set("process", process);
  return `/evaluacion-uni?${search.toString()}`;
}

export default async function EvaluacionUniPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    until?: string;
    q?: string;
    process?: string;
    experience?: string;
  }>;
}) {
  const query = await searchParams;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(query.from || "")
    ? query.from!
    : DATE_DEFAULT;
  const until = /^\d{4}-\d{2}-\d{2}$/.test(query.until || "")
    ? query.until!
    : "";
  const q = query.q?.trim() || "";

  let records: any[] = [];
  let apiError = "";
  try {
    records = await searchUniAwardedProcesses(from, until || undefined);
  } catch (error) {
    apiError =
      error instanceof Error
        ? error.message
        : "No se pudo consultar la API DNCP.";
  }

  const filteredRecords = q
    ? records.filter((record) => {
        const tender = tenderOf(record);
        const suppliers = awardedSuppliers(record);
        const searchText = [
          tender.title,
          tender.id,
          record.ocid,
          ...suppliers.flatMap((supplier) => [supplier.name, supplier.ruc]),
        ]
          .join(" ")
          .toLowerCase();
        return searchText.includes(q.toLowerCase());
      })
    : records;
  const selected =
    filteredRecords.find((record) => recordKey(record) === query.process) ||
    null;
  let selectedFull: any = selected;
  let detailError = "";
  if (selected && tenderIdOf(selected)) {
    try {
      selectedFull = await fetchTenderDetails(tenderIdOf(selected));
    } catch {
      detailError =
        "No se pudo cargar el detalle completo. Se muestran los datos de búsqueda disponibles.";
    }
  }
  const suppliers = selected
    ? awardedSuppliers(selectedFull).length
      ? awardedSuppliers(selectedFull)
      : awardedSuppliers(selected)
    : [];
  const assessments = selected
    ? await Promise.all(
        suppliers.map((supplier) => assessSupplier(supplier, selected)),
      )
    : [];
  assessments.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const supplierRows = assessments.map((supplier) => {
    const experience = experienceOf(selectedFull, selected, supplier.ruc);
    const byProcess = db
      .select()
      .from(contratos)
      .where(
        and(
          eq(contratos.proveedorRuc, supplier.ruc),
          eq(contratos.ocid, experience.ocid),
        ),
      )
      .get();
    const byId = db
      .select()
      .from(contratos)
      .where(eq(contratos.id, experience.id))
      .get();
    return {
      ...supplier,
      experience,
      experienceSaved: Boolean(
        byProcess || byId?.proveedorRuc === supplier.ruc,
      ),
    };
  });

  const params = { from, until, q };
  const totalAwarded = records.length;
  const supplierCount = new Set(
    records.flatMap(awardedSuppliers).map((supplier) => supplier.ruc),
  ).size;
  const warningCount = assessments.reduce(
    (sum, supplier) => sum + supplier.warnings,
    0,
  );
  const sanctionsAssessedCount = assessments.filter(
    (supplier) => supplier.sanctionsKnown,
  ).length;
  const selectedTender = selected ? tenderOf(selectedFull) : null;
  const selectedTitle =
    selectedTender?.title ||
    tenderOf(selected)?.title ||
    "Licitación seleccionada";
  const selectedAmount = selected
    ? (amountOf(selectedFull) ?? amountOf(selected))
    : null;

  return (
    <div className="uni-dashboard">
      <section className="uni-heading">
        <div>
          <p className="uni-eyebrow">
            UNIVERSIDAD NACIONAL DE ITAPÚA · SICP 237
          </p>
          <h1>Adjudicaciones bajo revisión</h1>
          <p className="uni-intro">
            Consulta contratos adjudicados y compara señales disponibles de cada
            proveedor.
          </p>
        </div>
        <div className="uni-mode">
          <span /> Ranking de prueba · no es decisión oficial
        </div>
      </section>

      <section className="uni-stats" aria-label="Resumen de resultados">
        <div className="uni-stat">
          <span>Procesos encontrados</span>
          <strong>{apiError ? "—" : totalAwarded}</strong>
          <small>Máximo 100 por consulta</small>
        </div>
        <div className="uni-stat">
          <span>Proveedores distintos</span>
          <strong>{apiError ? "—" : supplierCount}</strong>
          <small>En resultados actuales</small>
        </div>
        <div className="uni-stat">
          <span>En licitación elegida</span>
          <strong>{selected ? suppliers.length : "—"}</strong>
          <small>
            {selected ? "Proveedores adjudicados" : "Selecciona un proceso"}
          </small>
        </div>
        <div className="uni-stat uni-stat--alert">
          <span>Amonestaciones detectadas</span>
          <strong>
            {selected && sanctionsAssessedCount ? warningCount : "—"}
          </strong>
          <small>
            {selected
              ? `${sanctionsAssessedCount}/${suppliers.length} proveedores con datos`
              : "Sin proceso seleccionado"}
          </small>
        </div>
      </section>

      {apiError && (
        <div className="uni-alert" role="alert">
          <strong>No se pudieron cargar las adjudicaciones.</strong>
          <span>
            {apiError === "DNCP_REQUEST_TOKEN is not configured"
              ? "Configura DNCP_REQUEST_TOKEN en el entorno del servidor para habilitar la conexión."
              : apiError.startsWith("oauth/token failed:")
                ? `DNCP rechazó la autenticación (HTTP ${apiError.split(": ").pop()}). Verifica DNCP_REQUEST_TOKEN.`
                : apiError.match(/failed: (\d{3})/)
                  ? `DNCP respondió HTTP ${apiError.match(/failed: (\d{3})/)?.[1]}. Revisa la URL base y vuelve a intentar.`
                  : "Revisa la conexión y vuelve a intentar."}
          </span>
        </div>
      )}

      {query.experience && (
        <div className="uni-success" role="status">
          {query.experience === "saved"
            ? "Proveedor guardado en la base local."
            : "Este proveedor ya estaba registrado."}
        </div>
      )}

      <div className="uni-workspace">
        <section className="uni-panel uni-process-panel">
          <div className="uni-panel-head">
            <div>
              <p className="uni-eyebrow">FUENTE DNCP · ADJUDICADA</p>
              <h2>Licitaciones cerradas</h2>
            </div>
            <span className="uni-count">
              {filteredRecords.length} resultados
            </span>
          </div>
          <form className="uni-filters" action="/evaluacion-uni">
            <label>
              Desde
              <input type="date" name="from" defaultValue={from} />
            </label>
            <label>
              Hasta
              <input type="date" name="until" defaultValue={until} />
            </label>
            <label className="uni-filter-search">
              Buscar proceso o proveedor
              <input
                name="q"
                defaultValue={q}
                placeholder="Nombre, RUC o código"
              />
            </label>
            <button type="submit" className="uni-button">
              Aplicar
            </button>
          </form>
          <div className="uni-process-list">
            {filteredRecords.map((record) => {
              const key = recordKey(record);
              const tender = tenderOf(record);
              const recordSuppliers = awardedSuppliers(record);
              const active = selected && recordKey(selected) === key;
              return (
                <Link
                  key={key || `${tender.title}-${dateOf(record)}`}
                  href={queryHref(params, key)}
                  className={`uni-process${active ? " is-active" : ""}`}
                  aria-current={active ? "true" : undefined}
                >
                  <span className="uni-process-date">
                    {dateOf(record) || "Fecha no informada"}
                  </span>
                  <strong>
                    {tender.title || tender.id || "Licitación sin título"}
                  </strong>
                  <span className="uni-process-meta">
                    <span>{record.ocid || tender.id || "ID no informado"}</span>
                    <span>
                      {money(
                        amountOf(record),
                        awardsOf(record)[0]?.value?.currency || "PYG",
                      )}
                    </span>
                  </span>
                  <span className="uni-process-suppliers">
                    {recordSuppliers.length
                      ? recordSuppliers
                          .map((supplier) => supplier.name)
                          .join(" · ")
                      : "Proveedor no incluido en el resumen"}
                  </span>
                </Link>
              );
            })}
            {!apiError && filteredRecords.length === 0 && (
              <div className="uni-empty">
                <strong>Sin adjudicaciones para estos filtros.</strong>
                <span>Amplía las fechas o borra la búsqueda.</span>
              </div>
            )}
          </div>
          {records.length === 100 && (
            <p className="uni-list-note">
              Se muestran los primeros 100 resultados. Ajusta las fechas para
              acotar.
            </p>
          )}
        </section>

        <section className="uni-panel uni-ranking-panel">
          {!selected ? (
            <div className="uni-selection-empty">
              <span className="uni-empty-mark">↙</span>
              <p className="uni-eyebrow">EXPEDIENTE DE EVALUACIÓN</p>
              <h2>Elige una licitación</h2>
              <p>
                El detalle reunirá adjudicación, antecedentes, sanciones y
                registros internos disponibles.
              </p>
            </div>
          ) : (
            <>
              <div className="uni-panel-head uni-detail-head">
                <div>
                  <p className="uni-eyebrow">
                    EXPEDIENTE · {dateOf(selected) || "FECHA NO INFORMADA"}
                  </p>
                  <h2>{selectedTitle}</h2>
                </div>
                <Link href={`/proveedores`} className="uni-text-link">
                  Ver proveedores →
                </Link>
              </div>
              <div className="uni-tender-facts">
                <span>
                  <small>Proceso</small>
                  <strong>
                    {selected.ocid || tenderIdOf(selected) || "ID no informado"}
                  </strong>
                </span>
                <span>
                  <small>Monto adjudicado</small>
                  <strong>
                    {money(
                      selectedAmount,
                      awardsOf(selectedFull)[0]?.value?.currency || "PYG",
                    )}
                  </strong>
                </span>
                <span>
                  <small>Proveedores</small>
                  <strong>{suppliers.length}</strong>
                </span>
              </div>
              {detailError && <p className="uni-inline-note">{detailError}</p>}
              <div className="uni-ranking-title">
                <div>
                  <p className="uni-eyebrow">COMPARACIÓN DE PROVEEDORES</p>
                  <h3>Orden sugerido</h3>
                </div>
                <span>SIMULADO</span>
              </div>
              <p className="uni-method-note">
                Puntaje sobre señales disponibles: experiencia previa (40%),
                evaluaciones D6 (30%) y sanciones (30%). Dimensiones faltantes
                no se cuentan como evidencia favorable ni desfavorable.
              </p>
              <div className="uni-supplier-list">
                {supplierRows.map((supplier, index) => (
                  <article className="uni-supplier" key={supplier.ruc}>
                    <div className="uni-supplier-main">
                      <span className="uni-rank">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="uni-supplier-name">
                        <Link
                          href={`/proveedores/${encodeURIComponent(supplier.ruc)}`}
                        >
                          {supplier.name}
                        </Link>
                        <span>RUC {supplier.ruc}</span>
                      </div>
                      <div className="uni-score">
                        <strong>
                          {supplier.score === null ? "—" : supplier.score}
                        </strong>
                        <small>
                          {supplier.score === null ? "sin puntaje" : "/ 100"}
                        </small>
                      </div>
                    </div>
                    <div
                      className="uni-score-track"
                      aria-label={
                        supplier.score === null
                          ? "Puntaje no disponible"
                          : `Puntaje ${supplier.score} de 100`
                      }
                    >
                      <span style={{ width: `${supplier.score ?? 0}%` }} />
                    </div>
                    <div className="uni-supplier-signals">
                      <span className="uni-badge">{supplier.label}</span>
                      <span>
                        {supplier.priorAwards === null
                          ? "Proveedor no disponible"
                          : `${supplier.priorAwards} adjudicaciones previas`}
                      </span>
                      <span>
                        {supplier.d6Average === null
                          ? "Sin evaluaciones D6"
                          : `D6 ${supplier.d6Average.toFixed(1)} / 5`}
                      </span>
                      <span>
                        {supplier.sanctionsKnown
                          ? supplier.warnings || supplier.disqualifications
                            ? `${supplier.warnings} amonest. · ${supplier.disqualifications} inhabilit.`
                            : "La API no reporta sanciones"
                          : "Sanciones no informadas"}
                      </span>
                      <span>{supplier.openClaims} reclamos abiertos</span>
                      <span>{supplier.evidenceCount}/3 señales con datos</span>
                    </div>
                    <form
                      action={addAwardExperience}
                      className="uni-experience-form"
                    >
                      <input type="hidden" name="ruc" value={supplier.ruc} />
                      <input
                        type="hidden"
                        name="supplierName"
                        value={supplier.name}
                      />
                      <input
                        type="hidden"
                        name="ocid"
                        value={supplier.experience.ocid}
                      />
                      <input
                        type="hidden"
                        name="contractId"
                        value={supplier.experience.id}
                      />
                      <input
                        type="hidden"
                        name="title"
                        value={supplier.experience.title}
                      />
                      <input
                        type="hidden"
                        name="buyer"
                        value={supplier.experience.buyer}
                      />
                      <input
                        type="hidden"
                        name="object"
                        value={supplier.experience.object}
                      />
                      <input
                        type="hidden"
                        name="dateSigned"
                        value={supplier.experience.dateSigned}
                      />
                      <input
                        type="hidden"
                        name="amount"
                        value={supplier.experience.amount ?? ""}
                      />
                      <input
                        type="hidden"
                        name="currency"
                        value={supplier.experience.currency}
                      />
                      <input
                        type="hidden"
                        name="status"
                        value={supplier.experience.status}
                      />
                      <input
                        type="hidden"
                        name="returnProcess"
                        value={recordKey(selected)}
                      />
                      <input type="hidden" name="from" value={from} />
                      <input type="hidden" name="until" value={until} />
                      <input type="hidden" name="q" value={q} />
                      <button
                        type="submit"
                        className="uni-add-experience"
                        disabled={supplier.experienceSaved}
                      >
                        {supplier.experienceSaved
                          ? "Proveedor guardado"
                          : "+ Añadir proveedor"}
                      </button>
                    </form>
                  </article>
                ))}
                {supplierRows.length === 0 && (
                  <div className="uni-empty">
                    <strong>
                      La licitación no incluye proveedores en la respuesta.
                    </strong>
                    <span>Revisa el expediente en DNCP.</span>
                  </div>
                )}
              </div>
              <p className="uni-disclaimer">
                Este orden es demostrativo. No sustituye la evaluación del
                comité ni determina elegibilidad.
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
