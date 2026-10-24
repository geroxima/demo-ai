import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Evaluación de proveedores · UNI",
  description: "Adjudicaciones, experiencia y señales de proveedores de la UNI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased app-body">
        <header className="app-header">
          <div className="app-header__inner">
            <Link href="/evaluacion-uni" className="app-brand">
              <span className="app-brand__mark">U</span>
              <span><strong>UNI</strong><small>Observatorio de proveedores</small></span>
            </Link>
            <nav className="app-nav" aria-label="Navegación principal">
              <Link href="/evaluacion-uni">Adjudicaciones</Link>
              <Link href="/proveedores">Proveedores</Link>
              <Link href="/proveedores/nuevo">Registrar proveedor</Link>
            </nav>
          </div>
        </header>
        <main className="app-main">{children}</main>
      </body>
    </html>
  );
}
