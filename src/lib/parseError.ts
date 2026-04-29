const CONSTRAINT_FIELD_MAP: Record<string, string> = {
  national_id: 'National ID',
  email: 'Email',
  phone: 'Phone number',
  phone_number: 'Phone number',
  username: 'Username',
};

const POSTGRES_CODE_MAP: Record<string, (text: string) => string> = {
  '23505': (text) => {
    const t = text.toLowerCase();
    for (const [key, label] of Object.entries(CONSTRAINT_FIELD_MAP)) {
      if (t.includes(key)) return `${label} already exists.`;
    }
    return 'This record already exists.';
  },
  '23502': (text) => {
    const match = text.match(/column "([^"]+)"/);
    if (match) {
      const col = match[1].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return `${col} is required.`;
    }
    return 'A required field is missing.';
  },
  '23503': () => 'The referenced record does not exist.',
  '42501': () => 'You do not have permission to perform this action.',
  '22001': () => 'One of the inputs is too long.',
  '22P02': () => 'Invalid format for one of the fields.',
  'PGRST116': () => 'Record not found.',
};

function mapMessage(msg: string): string {
  const m = msg.toLowerCase();

  if (m.includes('user already registered') || m.includes('email_exists') || m.includes('already been registered')) return 'Email already exists.';
  if (m.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (m.includes('email not confirmed')) return 'Please verify your email before logging in.';
  if (m.includes('jwt expired') || m.includes('token expired') || m.includes('invalid jwt')) return 'Your session has expired. Please log in again.';
  if (m.includes('fetch failed') || m.includes('failed to fetch') || m.includes('network')) return 'Network error. Please check your connection and try again.';
  if (m.includes('national_id') && (m.includes('duplicate') || m.includes('unique'))) return 'National ID already exists.';
  if (m.includes('duplicate key') || m.includes('unique constraint')) {
    for (const [key, label] of Object.entries(CONSTRAINT_FIELD_MAP)) {
      if (m.includes(key)) return `${label} already exists.`;
    }
    return 'This record already exists.';
  }
  if (m.includes('database error creating new user')) return 'Failed to create account. A field may already be in use.';
  if (m.includes('password should be at least') || m.includes('password must be')) return msg;
  if (m.includes('weak password')) return 'Password is too weak. Use at least 6 characters.';

  // Return raw message if it looks human-readable (short, no Postgres internals)
  if (msg.length < 200 && !m.includes('pg_') && !m.includes('relation "') && !m.includes('pgrst') && !m.includes('syntax error')) {
    return msg;
  }

  return 'An unexpected error occurred. Please try again.';
}

export function parseError(err: unknown): string {
  if (!err) return 'An unexpected error occurred.';
  if (typeof err === 'string') return mapMessage(err);

  if (typeof err === 'object') {
    const e = err as Record<string, unknown>;
    const code = e.code as string | undefined;
    const message = (e.message as string | undefined) ?? '';
    const details = (e.details as string | undefined) ?? '';

    if (code && POSTGRES_CODE_MAP[code]) {
      return POSTGRES_CODE_MAP[code](details || message);
    }

    if (message) return mapMessage(message);
  }

  return 'An unexpected error occurred. Please try again.';
}
