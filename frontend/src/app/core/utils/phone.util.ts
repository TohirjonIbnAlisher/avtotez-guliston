// O'zbekiston mobil raqamlari formati: +998 va 9 ta raqam
export const PHONE_PATTERN = /^\+998\d{9}$/;

export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, '');

  if (trimmed.startsWith('+')) {
    return `+${digits}`;
  }
  if (digits.length === 9) {
    return `+998${digits}`;
  }
  if (digits.startsWith('998') && digits.length === 12) {
    return `+${digits}`;
  }
  return trimmed;
}
