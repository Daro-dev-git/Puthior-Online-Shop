/**
 * Validates whether an email string is formatted correctly.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  // Standard RFC 5322 compliant regex for practical email validation
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return regex.test(email.trim());
}

/**
 * Normalizes email by trimming and lowercasing.
 */
export function normalizeEmail(email: string): string {
  return email ? email.trim().toLowerCase() : '';
}
