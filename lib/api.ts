/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from './db';
import { proveedores, contratos } from './schema';
import { eq } from 'drizzle-orm';

const DEFAULT_BASE = 'https://www.contrataciones.gov.py/datos/api/v3/doc';

export function getApiBaseUrl() {
  return (
    process.env.DNCP_API_BASE_URL ||
    process.env.API_BASE_URL ||
    process.env.API_BASE ||
    process.env.DNCP_BASE_URL ||
    DEFAULT_BASE
  ).replace(/\/$/, '');
}

export function getRequestToken() {
  const token = (
    process.env.REQUEST_TOKEN ||
    process.env.DNCP_REQUEST_TOKEN ||
    process.env.API_REQUEST_TOKEN ||
    process.env.DNCP_TOKEN ||
    ''
  );
  if (!token) throw new Error('DNCP_REQUEST_TOKEN is not configured');
  return token;
}

type CachedToken = { token: string; expiresAt: number };
let cachedToken: CachedToken | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;
  const res = await fetch(`${getApiBaseUrl()}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ request_token: getRequestToken() }),
  });
  if (!res.ok) throw new Error(`oauth/token failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  const token = data.access_token;
  let expiresAt = Date.now() + 14 * 60 * 1000;
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString('utf8')
    );
    if (payload?.exp) expiresAt = payload.exp * 1000 - 60 * 1000;
  } catch {}
  cachedToken = { token, expiresAt };
  return token;
}

async function apiFetch(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: { ...(init?.headers || {}), Authorization: token },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

function isValidSupplier(data: any) {
  if (!data || typeof data !== 'object') return false;
  if (data.status && Number(data.status) >= 400) return false;
  if (data.message && !data.name && !data.identifier) return false;
  return Boolean(data.identifier?.id || data.identifier?.legalName || data.name);
}

export async function fetchSupplier(ruc: string) {
  const id = ruc.trim();
  try {
    const data = await apiFetch(`/suppliers/${encodeURIComponent(id)}`);
    if (isValidSupplier(data)) return data;
  } catch {}
  try {
    const data = await apiFetch(
      `/search/suppliers?identifier.id=${encodeURIComponent(id)}&items_per_page=1`
    );
    const list = Array.isArray(data?.list) ? data.list : [];
    const match = list.find((item: any) => item?.identifier?.id === id);
    if (isValidSupplier(match)) return match;
  } catch {}
  throw new Error('supplier not found');
}

export function mapSupplierToProveedor(ruc: string, data: any) {
  const address = data?.address || {};
  const direccion = [address.streetAddress, address.locality, address.region]
    .filter(Boolean)
    .join(', ');
  return {
    ruc: ruc.trim(),
    razonSocial: data?.identifier?.legalName || data?.name || ruc.trim(),
    nombreComercial: data?.name || null,
    contacto: data?.contactPoint?.name || null,
    telefono: data?.contactPoint?.telephone || null,
    email: data?.contactPoint?.email || null,
    direccion: direccion || null,
  };
}

export async function searchProcessesBySupplier(ruc: string, limit = 20) {
  const data = await apiFetch(
    `/search/processes?awards.suppliers.id=${encodeURIComponent(ruc.trim())}&items_per_page=${limit}`
  );
  return Array.isArray(data?.records) ? data.records : [];
}

export async function searchUniAwardedProcesses(from: string, until?: string) {
  const params = new URLSearchParams({
    page: '1',
    items_per_page: '100',
    'parties.identifier.id': '237',
    fecha_desde: from,
    tipo_fecha: 'publicacion_llamado',
    'tender.statusDetails': 'Adjudicada',
    order: 'date desc',
  });
  if (until) params.set('fecha_hasta', until);
  const data = await apiFetch(`/search/processes?${params.toString()}`);
  return Array.isArray(data?.records) ? data.records : [];
}

export async function fetchTenderDetails(id: string) {
  return apiFetch(`/tender/${encodeURIComponent(id)}`);
}

export async function fetchContract(id: string) {
  const data = await apiFetch(`/contracts/${encodeURIComponent(id)}`);
  if (Array.isArray(data?.contracts) && data.contracts.length > 0) return data.contracts[0];
  return data;
}

export async function cargarProveedor(ruc: string) {
  const id = ruc.trim();
  if (!id) return null;
  const data = await fetchSupplier(id);
  const values = mapSupplierToProveedor(id, data);

  const existing = db.select().from(proveedores).where(eq(proveedores.ruc, id)).get();
  if (existing) {
    db.update(proveedores).set(values).where(eq(proveedores.ruc, id)).run();
  } else {
    db.insert(proveedores).values(values).run();
  }

  try {
    const records = await searchProcessesBySupplier(id, 30);
    for (const rec of records) {
      const cr = rec?.compiledRelease || {};
      const tender = cr?.tender || {};
      const contractIds = (cr?.contracts || [])
        .map((c: any) => c?.id)
        .filter(Boolean);
      const convocante = tender?.procuringEntity?.name || null;
      const llamado = tender?.title || tender?.id || rec?.ocid || null;
      const objeto = tender?.description || tender?.title || null;
      for (const cid of contractIds) {
        const exists = db.select().from(contratos).where(eq(contratos.id, cid)).get();
        if (exists) continue;
        let contract: any = null;
        try {
          contract = await fetchContract(cid);
        } catch {}
        const c = contract || {};
        db.insert(contratos)
          .values({
            id: cid,
            proveedorRuc: id,
            ocid: rec?.ocid || null,
            llamado,
            convocante,
            objeto,
            fechaFirma: (c?.dateSigned || '').toString().slice(0, 10) || null,
            fechaEntregaPrevista: null,
            fechaEntregaReal: null,
            monto: typeof c?.value?.amount === 'number' ? c.value.amount : null,
            moneda: c?.value?.currency || 'PYG',
            estado: c?.statusDetails || c?.status || null,
          })
          .run();
      }
    }
  } catch {}

  return values;
}

export const fetchProveedor = cargarProveedor;
export const loadProveedor = cargarProveedor;
export const obtenerProveedor = cargarProveedor;
export const cargarProveedorDesdeApi = cargarProveedor;
export const loadProvider = cargarProveedor;
export const fetchSupplierData = cargarProveedor;
