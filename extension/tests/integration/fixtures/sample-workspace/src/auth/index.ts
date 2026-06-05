import { sign, verify } from './jwt';

export function createAuth(secret: string) {
  return {
    sign: (id: string) => sign(id, secret),
    verify: (token: string) => verify(token, secret),
  };
}
