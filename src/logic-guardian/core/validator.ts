import { z } from 'zod';
import { ValidationError } from './errors';
import { logger } from '../utils/logger';

/**
 * Schema-based validator with advanced sanitization
 * Extends ARAVE pattern from PixoRA
 */

export interface ValidationResult<T> {
  success: boolean;
  data: T | null;
  error: ValidationError | null;
  warnings: string[];
}

export interface ValidatorOptions {
  strict?: boolean; // If true, don't auto-sanitize
  throwOnError?: boolean;
  logWarnings?: boolean;
}

export class SchemaValidator {
  /**
   * Validates and sanitizes data against Zod schema
   */
  public static async validate<T extends z.ZodTypeAny>(
    data: unknown,
    schema: T,
    options: ValidatorOptions = {}
  ): Promise<ValidationResult<z.infer<T>>> {
    const { strict = false, throwOnError = false, logWarnings = true } = options;
    const warnings: string[] = [];

    try {
      // Step 1: Preprocess data (trim strings, coerce types)
      const preprocessed = strict ? data : this.preprocessData(data, warnings);

      // Step 2: Sanitize against schema (if not strict)
      const sanitized = strict ? preprocessed : this.sanitizeData(preprocessed, schema, warnings);

      // Step 3: Final validation
      const result = schema.safeParse(sanitized);

      if (result.success) {
        if (logWarnings && warnings.length > 0) {
          logger.warn('Warnings during validation', { warnings });
        }
        return {
          success: true,
          data: result.data,
          error: null,
          warnings
        };
      }

      // Validation failed
      const error = new ValidationError(
        `Schema validation failed: ${result.error.message}`,
        {
          input: data,
          expected: schema.description,
          actual: sanitized,
          metadata: { zodIssues: result.error.issues }
        }
      );

      if (throwOnError) throw error;

      return {
        success: false,
        data: null,
        error,
        warnings
      };
    } catch (err) {
      const error = err instanceof ValidationError
        ? err
        : new ValidationError(
            `Validation error: ${err instanceof Error ? err.message : String(err)}`,
            { input: data }
          );

      if (throwOnError) throw error;

      return {
        success: false,
        data: null,
        error,
        warnings
      };
    }
  }

  /**
   * Batch validation for arrays
   */
  public static async validateBatch<T extends z.ZodTypeAny>(
    items: unknown[],
    schema: T,
    options: ValidatorOptions = {}
  ): Promise<{
    successful: z.infer<T>[];
    failed: Array<{ item: unknown; error: ValidationError }>;
    warnings: string[];
  }> {
    const successful: z.infer<T>[] = [];
    const failed: Array<{ item: unknown; error: ValidationError }> = [];
    const warnings: string[] = [];

    for (const item of items) {
      const result = await this.validate(item, schema, { ...options, throwOnError: false });
      
      if (result.success && result.data) {
        successful.push(result.data);
      } else if (result.error) {
        failed.push({ item, error: result.error });
      }

      warnings.push(...result.warnings);
    }

    return { successful, failed, warnings };
  }

  /**
   * Preprocesses data (trim, coerce types)
   */
  private static preprocessData(data: unknown, warnings: string[]): unknown {
    if (data === null || data === undefined) return data;

    if (typeof data === 'string') {
      const trimmed = data.trim();
      if (/^(true|false)$/i.test(trimmed)) {
        warnings.push(`Coerced string "${trimmed}" to boolean`);
        return /^true$/i.test(trimmed);
      }
      return trimmed;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.preprocessData(item, warnings));
    }

    if (typeof data === 'object' && data !== null) {
      const processed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        processed[key] = this.preprocessData(value, warnings);
      }
      return processed;
    }

    return data;
  }

  /**
   * Sanitizes data against schema structure
   */
  private static sanitizeData(data: unknown, schema: z.ZodTypeAny, warnings: string[]): unknown {
    const typeName = (schema as any)?._def?.typeName;

    if (!typeName) return data;

    switch (typeName) {
      case 'ZodObject':
        return this.sanitizeObject(data, schema as z.ZodObject<any>, warnings);
      case 'ZodArray':
        return this.sanitizeArray(data, schema as z.ZodArray<any>, warnings);
      case 'ZodNumber':
        return this.sanitizeNumber(data, schema, warnings);
      case 'ZodEnum':
        return this.sanitizeEnum(data, schema, warnings);
      default:
        return data;
    }
  }

  private static sanitizeObject(
    data: unknown,
    schema: z.ZodObject<any>,
    warnings: string[]
  ): Record<string, unknown> {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      warnings.push('Expected object, got ' + typeof data);
      return {};
    }

    const sanitized: Record<string, unknown> = {};
    const shape = schema.shape as Record<string, z.ZodTypeAny>;

    for (const [key, fieldSchema] of Object.entries(shape)) {
      if (key in data) {
        sanitized[key] = this.sanitizeData((data as any)[key], fieldSchema, warnings);
      }
    }

    return sanitized;
  }

  private static sanitizeArray(
    data: unknown,
    schema: z.ZodArray<any>,
    warnings: string[]
  ): unknown[] {
    if (!Array.isArray(data)) {
      warnings.push('Expected array, got ' + typeof data);
      return [];
    }

    return data.map(item => this.sanitizeData(item, (schema as any).element, warnings));
  }

  private static sanitizeNumber(data: unknown, schema: z.ZodTypeAny, warnings: string[]): number {
    if (typeof data === 'string') {
      const parsed = parseFloat(data);
      if (!isNaN(parsed)) {
        warnings.push(`Coerced string "${data}" to number ${parsed}`);
        return parsed;
      }
    }

    if (typeof data !== 'number') {
      warnings.push(`Expected number, got ${typeof data}`);
      return 0;
    }

    // Apply min/max constraints
    const checks = (schema as any)?._def?.checks || [];
    let result = data;

    for (const check of checks) {
      if (check.kind === 'min' && result < check.value) {
        warnings.push(`Number ${result} below minimum ${check.value}, clamping`);
        result = check.value;
      }
      if (check.kind === 'max' && result > check.value) {
        warnings.push(`Number ${result} above maximum ${check.value}, clamping`);
        result = check.value;
      }
    }

    return result;
  }

  private static sanitizeEnum(data: unknown, schema: z.ZodTypeAny, warnings: string[]): unknown {
    const values: unknown[] = (schema as any)?._def?.values || [];

    if (values.includes(data)) return data;

    // Try case-insensitive match for strings
    if (typeof data === 'string') {
      const normalized = data.toLowerCase().trim();
      const match = values.find(
        v => typeof v === 'string' && v.toLowerCase() === normalized
      );
      if (match) {
        warnings.push(`Enum value "${data}" normalized to "${match}"`);
        return match;
      }
    }

    // Fallback to first value
    const fallback = values[0];
    warnings.push(`Invalid enum value "${data}", defaulting to "${fallback}"`);
    return fallback;
  }
}