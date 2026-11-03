/**
 * Données structurées (schema.org) pour les moteurs de recherche.
 *
 * `<` est échappé : un titre de leçon contenant « </script> » refermerait sinon la balise
 * et laisserait la suite s'interpréter comme du HTML. Le bloc n'est pas exécuté
 * (`application/ld+json`) : la CSP ne s'y applique pas et il n'a pas besoin du nonce.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
