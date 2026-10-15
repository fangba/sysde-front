let counter = 0;

/** Identifiant unique dans le document, utile pour relier un dégradé SVG à sa forme. */
export function uniqueId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}
