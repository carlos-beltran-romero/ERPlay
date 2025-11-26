/**
 * @module back/services/shared/emailTemplates
 * Utilidades comunes para generar correos con el estilo corporativo.
 */

/**
 * Opciones para renderizar un correo con tarjeta.
 * @public
 */
export interface CardEmailOptions {
  readonly title: string;

  readonly bodyHtml: string;
  readonly accent?: string;
  readonly footerHtml?: string;
}

/**
 * Genera un layout HTML consistente con cabecera y tarjeta blanca.
 * El resultado está pensado para inyectarse directamente en `nodemailer`.
 *
 * @public
 * @param options - Configuración de la tarjeta a renderizar.
 * @returns HTML listo para enviarse por correo.
 */
export function renderCardEmail(options: CardEmailOptions): string {
  const accent = options.accent ?? '#F3F4F6';
  const year = new Date().getFullYear();

  return `
    <div style="background:#f5f7fb;padding:24px 16px;">
      <div style="
        max-width:680px;margin:0 auto;background:#ffffff;
        border:1px solid #e5e7eb;border-radius:12px;
        box-shadow:0 2px 10px rgba(17,24,39,0.06);
        overflow:hidden;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
        color:#111827;">
        <div style="padding:14px 20px;background:${accent};border-bottom:1px solid #e5e7eb;">
          <h2 style="margin:0;font-size:18px;line-height:1.3;color:#111827">${options.title}</h2>
        </div>
        <div style="padding:20px">
          ${options.bodyHtml}
        </div>
        <div style="padding:12px 20px;border-top:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:12px;">
          ${options.footerHtml ?? `&copy; ${year} ERPlay`}
        </div>
      </div>
    </div>
  `;
}

/**
 * Escapa caracteres problemáticos para que puedan insertarse en HTML.
 *
 * @public
 * @param raw - Cadena potencialmente sin sanear.
 * @returns Cadena segura para interpolar.
 */
export function escapeHtml(raw: string | null | undefined): string {
  return (raw ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Devuelve la letra asociada al índice de opción (A, B, C...).
 *
 * @public
 * @param index - Índice basado en cero.
 * @returns Letra mayúscula correspondiente.
 */
export function letterFromIndex(index: number): string {
  const value = Number.isFinite(index) ? Number(index) : 0;
  return String.fromCodePoint(65 + Math.max(0, value));
}
