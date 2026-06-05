export interface ErrorEnvelope { type: string; message: string; }
export function fail(type: string, message: string): ErrorEnvelope {
  return { type, message };
}
