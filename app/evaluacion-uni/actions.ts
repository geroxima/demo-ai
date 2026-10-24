'use server';

import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { contratos, proveedores } from '@/lib/schema';
import { cargarProveedor, mapSupplierToProveedor } from '@/lib/api';

export async function addAwardExperience(formData: FormData) {
  const ruc = String(formData.get('ruc') || '').trim();
  const supplierName = String(formData.get('supplierName') || '').trim() || ruc;
  const ocid = String(formData.get('ocid') || '').trim();
  const returnProcess = String(formData.get('returnProcess') || '').trim();
  const contractId = String(formData.get('contractId') || '').trim() || `DNCP-${ocid}-${ruc}`;
  const amountInput = String(formData.get('amount') || '').trim();
  const amountValue = amountInput ? Number(amountInput) : null;
  const amount = amountValue !== null && Number.isFinite(amountValue) ? amountValue : null;

  if (!ruc || !ocid) return;

  const localSupplier = db.select().from(proveedores).where(eq(proveedores.ruc, ruc)).get();
  if (!localSupplier) {
    try {
      await cargarProveedor(ruc);
    } catch {
      const values = mapSupplierToProveedor(ruc, {
        name: supplierName,
        identifier: { id: ruc, legalName: supplierName },
      });
      db.insert(proveedores).values(values).onConflictDoNothing().run();
    }
  }

  const existingByProcess = db.select().from(contratos).where(and(
    eq(contratos.proveedorRuc, ruc),
    eq(contratos.ocid, ocid),
  )).get();
  const existingById = db.select().from(contratos).where(eq(contratos.id, contractId)).get();
  const alreadySaved = Boolean(existingByProcess || existingById?.proveedorRuc === ruc);

  if (!alreadySaved && !existingById) {
    db.insert(contratos).values({
      id: contractId,
      proveedorRuc: ruc,
      ocid,
      llamado: String(formData.get('title') || '').trim() || null,
      convocante: String(formData.get('buyer') || '').trim() || null,
      objeto: String(formData.get('object') || '').trim() || null,
      fechaFirma: String(formData.get('dateSigned') || '').trim() || null,
      monto: amount,
      moneda: String(formData.get('currency') || '').trim() || 'PYG',
      estado: String(formData.get('status') || '').trim() || 'Adjudicada',
    }).onConflictDoNothing().run();
  }

  const params = new URLSearchParams();
  params.set('from', String(formData.get('from') || '2025-01-01'));
  if (formData.get('until')) params.set('until', String(formData.get('until')));
  if (formData.get('q')) params.set('q', String(formData.get('q')));
  params.set('process', returnProcess || ocid);
  params.set('experience', alreadySaved ? 'exists' : 'saved');
  redirect(`/evaluacion-uni?${params.toString()}`);
}
