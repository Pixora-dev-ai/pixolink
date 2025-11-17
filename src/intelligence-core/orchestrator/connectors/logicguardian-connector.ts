/**
 * LogicGuardian Connector - Validation & Runtime Checks
 * Integrates with Logic-Guardian for validation
 */

import { IOLBus } from '../eventBus';
import type { ConnectorResult, LogicGuardianValidation } from '../../types';

export class LogicGuardianConnector {
  /**
   * Validate data against schema
   */
  async validate<T = unknown>(
    data: T,
    _schema?: unknown
  ): Promise<ConnectorResult<LogicGuardianValidation>> {
    const startTime = Date.now();

    try {
      // TODO: Integrate with actual Logic-Guardian validation
      // For now, basic validation
      const validation: LogicGuardianValidation = {
        isValid: true,
        errors: [],
        warnings: []
      };

      // Basic checks
      if (data === null || data === undefined) {
        validation.isValid = false;
        validation.errors.push({
          field: 'root',
          message: 'Data cannot be null or undefined',
          severity: 'error'
        });
      }

      // Publish validation result
      await IOLBus.publish(
        validation.isValid ? 'PROMPT_ENHANCED' : 'VALIDATION_ERROR',
        {
          validation,
          data
        }
      );

      return {
        success: true,
        data: validation,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      await IOLBus.publish('ERROR_OCCURRED', {
        error: error instanceof Error ? error.message : 'Validation failed',
        context: 'logicguardian-validate'
      });

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Validation failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Validate prompt structure
   */
  async validatePrompt(prompt: string): Promise<ConnectorResult<LogicGuardianValidation>> {
    const startTime = Date.now();

    try {
      const validation: LogicGuardianValidation = {
        isValid: true,
        errors: [],
        warnings: []
      };

      // Check prompt length
      if (prompt.length < 3) {
        validation.isValid = false;
        validation.errors.push({
          field: 'prompt',
          message: 'Prompt is too short (minimum 3 characters)',
          severity: 'error'
        });
      }

      if (prompt.length > 500) {
        validation.warnings?.push('Prompt is very long, consider shortening');
      }

      // Check for potentially harmful content
      const harmfulPatterns = ['<script', 'javascript:', 'onerror='];
      for (const pattern of harmfulPatterns) {
        if (prompt.toLowerCase().includes(pattern)) {
          validation.isValid = false;
          validation.errors.push({
            field: 'prompt',
            message: 'Prompt contains potentially harmful content',
            severity: 'error'
          });
        }
      }

      return {
        success: true,
        data: validation,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Prompt validation failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Validate configuration
   */
  async validateConfig(config: Record<string, unknown>): Promise<ConnectorResult<LogicGuardianValidation>> {
    const startTime = Date.now();

    try {
      const validation: LogicGuardianValidation = {
        isValid: true,
        errors: [],
        warnings: []
      };

      // Check required fields
      if (!config.userId) {
        validation.isValid = false;
        validation.errors.push({
          field: 'userId',
          message: 'userId is required',
          severity: 'error'
        });
      }

      return {
        success: true,
        data: validation,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Config validation failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Check runtime constraints
   */
  async checkConstraints(
    constraints: Record<string, { min?: number; max?: number; required?: boolean }>,
    values: Record<string, unknown>
  ): Promise<ConnectorResult<LogicGuardianValidation>> {
    const startTime = Date.now();

    try {
      const validation: LogicGuardianValidation = {
        isValid: true,
        errors: [],
        warnings: []
      };

      for (const [key, constraint] of Object.entries(constraints)) {
        const value = values[key];

        // Check required
        if (constraint.required && (value === undefined || value === null)) {
          validation.isValid = false;
          validation.errors.push({
            field: key,
            message: `${key} is required`,
            severity: 'error'
          });
          continue;
        }

        // Check min/max for numbers
        if (typeof value === 'number') {
          if (constraint.min !== undefined && value < constraint.min) {
            validation.isValid = false;
            validation.errors.push({
              field: key,
              message: `${key} must be at least ${constraint.min}`,
              severity: 'error'
            });
          }

          if (constraint.max !== undefined && value > constraint.max) {
            validation.isValid = false;
            validation.errors.push({
              field: key,
              message: `${key} must be at most ${constraint.max}`,
              severity: 'error'
            });
          }
        }
      }

      return {
        success: true,
        data: validation,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Constraint check failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }
}

// Singleton instance
export const logicguardianConnector = new LogicGuardianConnector();
