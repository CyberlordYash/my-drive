import { AppError } from './AppError.js';

const RESERVED = new Set(['.', '..']);

const CONTROL_OR_SEPARATOR_CHARS = /[/\\\x00-\x1f]/;

/**
 * Validates a user-facing file/folder name. Rejects path separators and
 * control characters (which would be meaningless in a virtual filesystem and
 * are a classic injection vector if ever concatenated into a real path), and
 * caps length so it can't blow past MongoDB/UI limits.
 */
export function assertValidName(name: string): string {
  const trimmed = name.normalize('NFC').trim();
  if (trimmed.length < 1 || trimmed.length > 255) {
    throw AppError.badRequest('INVALID_NAME', 'Name must be between 1 and 255 characters');
  }
  if (RESERVED.has(trimmed)) {
    throw AppError.badRequest('INVALID_NAME', 'Name is reserved');
  }
  if (CONTROL_OR_SEPARATOR_CHARS.test(trimmed)) {
    throw AppError.badRequest('INVALID_NAME', 'Name contains invalid characters');
  }
  return trimmed;
}

/**
 * Drive-style collision resolution: "report.pdf" -> "report (1).pdf" if a
 * sibling with that name already exists. `exists` is injected so this stays
 * pure/testable without a DB round trip inside the helper itself.
 */
export async function resolveNameCollision(
  desiredName: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  if (!(await exists(desiredName))) return desiredName;

  const dotIndex = desiredName.lastIndexOf('.');
  const hasExt = dotIndex > 0 && dotIndex < desiredName.length - 1;
  const base = hasExt ? desiredName.slice(0, dotIndex) : desiredName;
  const ext = hasExt ? desiredName.slice(dotIndex) : '';

  for (let n = 1; n < 1000; n += 1) {
    const candidate = `${base} (${n})${ext}`;
    // eslint-disable-next-line no-await-in-loop
    if (!(await exists(candidate))) return candidate;
  }
  throw AppError.conflict('NAME_CONFLICT', 'Could not resolve a unique name');
}
