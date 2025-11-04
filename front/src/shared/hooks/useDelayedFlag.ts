import { useEffect, useState } from "react";

/**
 * Retrasa la activación de una bandera para evitar parpadeos de carga.
 * @param active - Valor original de la bandera.
 * @param delayMs - Tiempo en milisegundos antes de activar la bandera.
 * @returns `true` cuando la bandera ha permanecido activa durante el retraso indicado.
 */
export function useDelayedFlag(active: boolean, delayMs = 200): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }

    const timeout = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timeout);
  }, [active, delayMs]);

  return visible;
}
