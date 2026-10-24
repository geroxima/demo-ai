import { db } from '@/lib/db';
import { contratos, evaluaciones } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

async function crear(formData: FormData) {
  'use server';
  const proveedorRuc = decodeURIComponent((formData.get('proveedorRuc') as string) || '');
  const contratoId = formData.get('contratoId') as string;
  const calidad = Number(formData.get('calidad') || 0);
  const cumplimientoPlazos = Number(formData.get('cumplimientoPlazos') || 0);
  const gradoSatisfaccion = Number(formData.get('gradoSatisfaccion') || 0);
  const notaFinal = (calidad + cumplimientoPlazos + gradoSatisfaccion) / 3;
  db.insert(evaluaciones).values({
    id: uuidv4(),
    contratoId,
    proveedorRuc,
    unidadSolicitante: (formData.get('unidadSolicitante') as string || '').trim() || null,
    fecha: (formData.get('fecha') as string || '').trim() || new Date().toISOString().slice(0,10),
    calidad,
    cumplimientoPlazos,
    gradoSatisfaccion,
    reincidencias: Number(formData.get('reincidencias') || 0),
    notaFinal,
    comentarios: (formData.get('comentarios') as string || '').trim() || null,
  }).run();
  redirect(`/proveedores/${encodeURIComponent(proveedorRuc)}`);
}

export default async function NuevaEvaluacion({ params }: { params: Promise<{ ruc: string }> }) {
  const { ruc: rawRuc } = await params;
  const ruc = decodeURIComponent(rawRuc);
  const contrs = db.select().from(contratos).where(eq(contratos.proveedorRuc, ruc)).all();
  return (
    <div className="evaluation-page">
      <div className="evaluation-heading">
        <h1>Agregar evaluación</h1>
        <p>Registra el desempeño del proveedor para el contrato seleccionado.</p>
      </div>
      <form action={crear} className="evaluation-form">
        <input type="hidden" name="proveedorRuc" value={ruc} />
        <label className="evaluation-field">Contrato *
          <select name="contratoId" required defaultValue={contrs[0]?.id || ""}>
            {contrs.map(c=>(<option key={c.id} value={c.id}>{c.llamado || c.id} - {c.convocante}</option>))}
          </select>
        </label>
        {contrs.length === 0 && <p className="evaluation-empty">Este proveedor todavía no tiene contratos registrados.</p>}
        <div className="evaluation-context-fields">
          <label className="evaluation-field">Unidad solicitante<input name="unidadSolicitante" /></label>
          <label className="evaluation-field">Fecha<input type="date" name="fecha" /></label>
        </div>
        <fieldset className="evaluation-score-group">
          <legend>Desempeño</legend>
          <div className="evaluation-scores">
            <label className="evaluation-field">Calidad <span>1–5</span><input name="calidad" type="number" min="1" max="5" required /></label>
            <label className="evaluation-field">Cumplimiento de plazos <span>1–5</span><input name="cumplimientoPlazos" type="number" min="1" max="5" required /></label>
            <label className="evaluation-field">Satisfacción <span>1–5</span><input name="gradoSatisfaccion" type="number" min="1" max="5" required /></label>
            <label className="evaluation-field">Reincidencias <span>cantidad</span><input name="reincidencias" type="number" min="0" defaultValue="0" /></label>
          </div>
        </fieldset>
        <label className="evaluation-field">Comentarios<textarea name="comentarios" rows={4} /></label>
        <button className="evaluation-submit" disabled={contrs.length === 0}>Guardar evaluación</button>
      </form>
    </div>
  );
}
