import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Unit tests for environment configuration validation
// ---------------------------------------------------------------------------
// We cannot import env.ts directly here as it calls parseEnv() at module load.
// We test the schema logic by constructing the parser independently.

import { z } from 'zod';

const larkProviderSchema = z.enum(['lark', 'feishu']).default('lark');

const portSchema = z
  .string()
  .default('3001')
  .transform((v) => parseInt(v, 10))
  .pipe(z.number().int().min(1).max(65535));

describe('Environment schema', () => {
  describe('larkProviderSchema', () => {
    it('accepts "lark"', () => {
      expect(larkProviderSchema.parse('lark')).toBe('lark');
    });

    it('accepts "feishu"', () => {
      expect(larkProviderSchema.parse('feishu')).toBe('feishu');
    });

    it('defaults to "lark" when undefined', () => {
      expect(larkProviderSchema.parse(undefined)).toBe('lark');
    });

    it('rejects invalid provider', () => {
      const result = larkProviderSchema.safeParse('discord');
      expect(result.success).toBe(false);
    });
  });

  describe('portSchema', () => {
    it('parses valid port string', () => {
      expect(portSchema.parse('3001')).toBe(3001);
    });

    it('defaults to 3001', () => {
      expect(portSchema.parse(undefined)).toBe(3001);
    });

    it('rejects port above 65535', () => {
      const result = portSchema.safeParse('70000');
      expect(result.success).toBe(false);
    });
  });
});
