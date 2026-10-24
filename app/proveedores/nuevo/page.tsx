import { redirect } from 'next/navigation';
import { cargarProveedor } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function crear(formData: FormData) {
  'use server';
  const ruc = (formData.get('ruc') as string || '').trim();
  if (!ruc) return;
  try {
    await cargarProveedor(ruc);
  } catch {
    redirect(`/proveedores/nuevo?error=notfound&ruc=${encodeURIComponent(ruc)}`);
  }
  redirect(`/proveedores/${encodeURIComponent(ruc)}`);
}

export default async function NuevoProveedor({ searchParams }: { searchParams: Promise<{ error?: string; ruc?: string }> }) {
  const params = await searchParams;
  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Nuevo proveedor</h1>
      {params?.error === 'notfound' && (
        <div className="border border-red-300 bg-red-50 text-red-700 rounded p-3 text-sm">
          No se encontró el proveedor en la API para el RUC {params.ruc || ''}. No se guardó.
        </div>
      )}
      <form action={crear} className="grid gap-3 bg-white border rounded p-4">
        <div className="grid gap-1"><label className="text-sm">RUC *</label><input name="ruc" required defaultValue={params?.ruc || ''} className="border rounded px-3 py-2" /></div>
        <button className="bg-black text-white px-4 py-2 rounded w-fit">Guardar</button>
      </form>
    </div>
  );
}
