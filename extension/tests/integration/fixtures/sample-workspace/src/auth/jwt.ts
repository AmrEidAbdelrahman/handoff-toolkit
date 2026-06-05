import crypto from 'node:crypto';

export function sign(userId: string, secret: string): string {
  const body = Buffer.from(JSON.stringify({ userId })).toString('base64url');
  const mac = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${mac}`;
}

export function verify(token: string, secret: string): boolean {
  const [body, mac] = token.split('.');
  if (!body || !mac) return false;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return mac === expected;
}
