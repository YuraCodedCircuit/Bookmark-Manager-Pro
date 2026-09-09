import { z } from 'zod';

/** Configure runtime schemas for extension pages whose CSP forbids dynamic code. */
export function configureRuntimeValidation(): void {
  z.config({ jitless: true });
}

configureRuntimeValidation();
