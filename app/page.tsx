import { db } from '@/lib/db';
import { proveedores } from '@/lib/schema';
import { seedIfEmpty } from '@/lib/seed';

export const dynamic = 'force-dynamic';

export default function Home() {
  seedIfEmpty();
  const list = db.select().from(proveedores).all();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Buscar proveedor</h1>
        <p className="text-sm text-gray-600">Busque por RUC o razón social</p>
      </div>
      <form action="/proveedores" className="flex gap-2">
        <input name="q" placeholder="RUC o nombre..." className="border rounded px-3 py-2 w-full max-w-md" />
        <button className="bg-black text-white px-4 py-2 rounded">Buscar</button>
      </form>
      <div>
        <h2 className="font-medium mb-2">Proveedores registrados</h2>
        <div className="grid gap-2">
          {list.map((p) => (
            <a key={p.ruc} href={`/proveedores/${p.ruc}`} className="border rounded p-3 bg-white hover:bg-gray-50 flex justify-between">
              <div>
                <div className="font-medium">{p.razonSocial}</div>
                <div className="text-sm text-gray-600">RUC: {p.ruc}</div>
              </div>
              <div className="text-sm text-gray-500">Ver historia clínica →</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
