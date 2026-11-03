'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Cadre d'un tableau de leçon trop large pour l'écran.
 *
 * Le tableau défile dans son conteneur (voir `.table-scroll` dans globals.css), mais rien ne
 * le signalait : mesuré à 375 px, le tableau des suffixes de possession montre 3 colonnes
 * sur 5, et le bord droit du cadre laisse croire qu'il s'arrête là. On mesure donc le
 * débordement, et l'on affiche une mention et un dégradé du côté où il reste à lire.
 * Sur un écran assez large, rien n'apparaît.
 */
export default function ScrollTable({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ overflow: false, start: true, end: true });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdges({
        overflow: el.scrollWidth > el.clientWidth + 1,
        start: el.scrollLeft <= 1,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
      });
    // Le ResizeObserver appelle `update` dès l'observation, puis à chaque redimensionnement.
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener('scroll', update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', update);
    };
  }, []);

  return (
    <div
      className="table-frame"
      data-overflow={edges.overflow}
      data-start={edges.start}
      data-end={edges.end}
    >
      {edges.overflow && (
        // Masquée aux lecteurs d'écran : ils parcourent un tableau cellule par cellule,
        // le défilement visuel ne les concerne pas.
        <p className="table-hint" aria-hidden="true">
          Faites glisser le tableau →
        </p>
      )}
      <div className="table-box">
        {/* `tabIndex` : une zone défilante doit pouvoir l'être au clavier seul. */}
        <div ref={ref} className="table-scroll" tabIndex={0}>
          {children}
        </div>
      </div>
    </div>
  );
}
