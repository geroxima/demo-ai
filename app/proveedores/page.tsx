import Link from 'next/link';
import { db } from '@/lib/db';
import { proveedores } from '@/lib/schema';
import { like, or } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function ProveedoresPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: qRaw } = await searchParams;
  const q = qRaw?.trim() || '';
  let list = db.select().from(proveedores).all();
  if (q) {
    list = db.select().from(proveedores)
      .where(or(like(proveedores.ruc, `%${q}%`), like(proveedores.razonSocial, `%${q}%`), like(proveedores.nombreComercial, `%${q}%`)))
      .all();
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Proveedores</h1>
        <Link href="/proveedores/nuevo" className="text-sm underline">Nuevo proveedor</Link>
      </div>
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar por RUC o nombre" className="border rounded px-3 py-2 w-full max-w-md" />
        <button className="border px-4 py-2 rounded">Buscar</button>
      </form>
      <div className="grid gap-2">
        {list.map((p) => (
          <Link key={p.ruc} href={`/proveedores/${p.ruc}`} className="border rounded p-3 bg-white hover:bg-gray-50">
            <div className="font-medium">{p.razonSocial}</div>
            <div className="text-sm text-gray-600">RUC: {p.ruc}{p.nombreComercial ? ` · ${p.nombreComercial}` : ''}</div>
          </Link>
        ))}
        {list.length === 0 && <div className="text-sm text-gray-600">Sin resultados</div>}
      </div>
    </div>
  );
}
