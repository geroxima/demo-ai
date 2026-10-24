import { db } from '@/lib/db';
import { proveedores, contratos, entregas, evaluaciones } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { cargarProveedor } from '@/lib/api';

export const dynamic = 'force-dynamic';

function avg(nums: (number|null)[]) {
  const valid = nums.filter((n) => n !== null && n !== undefined) as number[];
  if (valid.length === 0) return null;
  return valid.reduce((a,b)=>a+b,0)/valid.length;
}

export default async function HistoriaClinica({ params }: { params: Promise<{ ruc: string }> }) {
  const { ruc: rawRuc } = await params;
  const ruc = decodeURIComponent(rawRuc);
  try { await cargarProveedor(ruc); } catch {}
  const prov = db.select().from(proveedores).where(eq(proveedores.ruc, ruc)).get();
  if (!prov) return <div>Proveedor no encontrado</div>;

  const contrs = db.select().from(contratos).where(eq(contratos.proveedorRuc, ruc)).all();
  const evals = db.select().from(evaluaciones).where(eq(evaluaciones.proveedorRuc, ruc)).all();

  const entregasAll = contrs.length ? db.select().from(entregas).all().filter(e => contrs.find(c=>c.id===e.contratoId)) : [];
  const cumplidos = entregasAll.filter(e=>e.cumplePlazo).length;
  const totalEnt = entregasAll.length;
  const pctCumpl = totalEnt ? Math.round((cumplidos/totalEnt)*100) : null;

  const notaProm = avg(evals.map(e=>e.notaFinal));
  const satProm = avg(evals.map(e=>e.gradoSatisfaccion));
  const calProm = avg(evals.map(e=>e.calidad));

  const reincTotal = evals.reduce((a,e)=>a + (e.reincidencias||0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded p-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{prov.razonSocial}</h1>
          <div className="text-sm text-gray-600">RUC: {prov.ruc}{prov.nombreComercial ? ` · ${prov.nombreComercial}` : ''}</div>
          {(prov.contacto||prov.telefono||prov.email) && <div className="text-sm text-gray-600 mt-1">{[prov.contacto, prov.telefono, prov.email].filter(Boolean).join(' · ')}</div>}
        </div>
        <div className="flex gap-2 text-sm">
          <Link href={`/proveedores/${ruc}/evaluacion/nueva`} className="border px-3 py-1 rounded">+ Evaluación</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border rounded p-3"><div className="text-xs text-gray-600">Contratos</div><div className="text-lg font-semibold">{contrs.length}</div></div>
        <div className="bg-white border rounded p-3"><div className="text-xs text-gray-600">Cumpl. plazos</div><div className="text-lg font-semibold">{pctCumpl !== null ? pctCumpl+'%' : '-'}</div></div>
        <div className="bg-white border rounded p-3"><div className="text-xs text-gray-600">Nota final prom.</div><div className="text-lg font-semibold">{notaProm !== null ? notaProm.toFixed(2) : '-'}</div></div>
        <div className="bg-white border rounded p-3"><div className="text-xs text-gray-600">Satisfacción/Calidad / Reincidencias</div><div className="text-lg font-semibold">{satProm!==null?satProm.toFixed(1):'-'} / {calProm!==null?calProm.toFixed(1):'-'} / {reincTotal}</div></div>
      </div>

      <section className="bg-white border rounded p-4 space-y-3">
        <h2 className="font-medium">Evaluaciones</h2>
        {evals.length === 0 && <div className="text-sm text-gray-600">Sin evaluaciones</div>}
        {evals.map(e=>(
          <div key={e.id} className="border rounded p-3">
            <div className="flex justify-between"><div className="font-medium">Nota: {e.notaFinal?.toFixed(2) || '-'}</div><div className="text-sm text-gray-600">{e.fecha}</div></div>
            <div className="text-sm text-gray-600">{e.unidadSolicitante}</div>
            <div className="text-xs text-gray-600 mt-1">Calidad {e.calidad}/5 · Plazos {e.cumplimientoPlazos}/5 · Satisfacción {e.gradoSatisfaccion}/5 · Reincidencias {e.reincidencias}</div>
            {e.comentarios && <div className="text-sm mt-1">{e.comentarios}</div>}
          </div>
        ))}
      </section>
    </div>
  );
}
