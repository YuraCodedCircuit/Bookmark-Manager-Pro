import { gradientDirectionSchema } from '../domain/bookmark';

const decimalDegreesPattern = /^\d{1,3}$/;

/** Parses untrusted UI text as an integer CSS angle from 0 through 359 degrees. */
export function parseGradientDirection(value: string): number {
  const trimmed = value.trim();
  if (!decimalDegreesPattern.test(trimmed)) {
    throw new Error('invalid-gradient-direction');
  }
  return gradientDirectionSchema.parse(Number(trimmed));
}
