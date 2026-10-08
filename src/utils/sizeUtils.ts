/**
 * Size ordering and parsing utilities for girl dress shop catalog.
 * Handles numeric sizes (e.g., '2', '4', '6', '8', '10', '12', '70', '80', '90', '100', '110'...)
 * as well as labeled sizes ('Size 4', 'Size 10', '100cm') and standard letter sizes ('XS', 'S', 'M', 'L', 'XL').
 */

/**
 * Extracts a numeric value from a size string for natural numeric sorting.
 * Ensures '2' < '4' < '6' < '8' < '10' < '12' instead of alphabetical '10' < '2'.
 */
export function parseSizeToNumber(size: string): number {
  if (!size) return 0;
  const trimmed = size.trim();

  // 1. Check for numeric match anywhere in string, e.g., "Size 10" -> 10, "100" -> 100, "2.5" -> 2.5
  const match = trimmed.match(/\d+(\.\d+)?/);
  if (match) {
    return parseFloat(match[0]);
  }

  // 2. Standard clothing letter size scale fallback
  const letterMap: Record<string, number> = {
    'XXS': 1,
    'XS': 2,
    'S': 3,
    'M': 4,
    'L': 5,
    'XL': 6,
    'XXL': 7,
    '2XL': 7,
    '3XL': 8,
    '4XL': 9,
  };

  const upper = trimmed.toUpperCase();
  if (letterMap[upper] !== undefined) {
    return 1000 + letterMap[upper];
  }

  // Fallback high number
  return 9999;
}

/**
 * Comparator function to order sizes by size number.
 * Usage: sizesArray.sort(compareSizes)
 */
export function compareSizes(a: string, b: string): number {
  const numA = parseSizeToNumber(a);
  const numB = parseSizeToNumber(b);

  if (numA !== numB) {
    return numA - numB;
  }

  // Secondary fallback: natural string comparison
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Sort an array of objects containing a Size property by size number.
 */
export function sortVariantsBySize<T extends { Size: string; Color?: string }>(variants: T[]): T[] {
  return [...variants].sort((a, b) => {
    const sizeComparison = compareSizes(a.Size, b.Size);
    if (sizeComparison !== 0) return sizeComparison;
    if (a.Color && b.Color) {
      return a.Color.localeCompare(b.Color);
    }
    return 0;
  });
}
