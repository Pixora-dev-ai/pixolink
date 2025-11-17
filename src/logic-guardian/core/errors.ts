/**
 * Custom Error Classes for Logic & Algorithm Failures
 * Extends the GenAIError pattern from PixoRA
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  VALIDATION = 'validation',
  INVARIANT = 'invariant',
  STATE = 'state',
  ALGORITHM = 'algorithm',
  SIDE_EFFECT = 'side_effect',
  PERFORMANCE = 'performance',
  CIRCUIT_BREAKER = 'circuit_breaker'
}

export interface ErrorContext {
  input?: any;
  output?: any;
  expected?: any;
  actual?: any;
  state?: any;
  metadata?: Record<string, any>;
}

/**
 * Base class for all logic/algorithm errors
 */
export class LogicError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly timestamp: number;
  public readonly canRetry: boolean;
  public readonly userFriendlyMessage: string;

  constructor(
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: ErrorContext = {},
    canRetry: boolean = false,
    userFriendlyMessage?: string
  ) {
    super(message);
    this.name = 'LogicError';
    this.category = category;
    this.severity = severity;
    this.context = context;
    this.timestamp = Date.now();
    this.canRetry = canRetry;
    this.userFriendlyMessage = userFriendlyMessage || this.getDefaultUserMessage();
  }

  private getDefaultUserMessage(): string {
    const arabicMessages: Record<ErrorCategory, string> = {
      [ErrorCategory.VALIDATION]: 'فشل في التحقق من صحة البيانات',
      [ErrorCategory.INVARIANT]: 'انتهاك قواعد المنطق الأساسية',
      [ErrorCategory.STATE]: 'حالة النظام غير صالحة',
      [ErrorCategory.ALGORITHM]: 'خطأ في الخوارزمية',
      [ErrorCategory.SIDE_EFFECT]: 'تأثير جانبي غير متوقع',
      [ErrorCategory.PERFORMANCE]: 'مشكلة في الأداء',
      [ErrorCategory.CIRCUIT_BREAKER]: 'الخدمة غير متاحة مؤقتاً'
    };
    return arabicMessages[this.category] || 'حدث خطأ غير متوقع';
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp,
      canRetry: this.canRetry,
      userFriendlyMessage: this.userFriendlyMessage,
      stack: this.stack
    };
  }
}

/**
 * Schema validation errors (Zod integration)
 */
export class ValidationError extends LogicError {
  constructor(message: string, context: ErrorContext = {}, userMessage?: string) {
    super(
      message,
      ErrorCategory.VALIDATION,
      ErrorSeverity.HIGH,
      context,
      false,
      userMessage || 'البيانات المدخلة غير صحيحة'
    );
    this.name = 'ValidationError';
  }
}

/**
 * Algorithm invariant violations (pre/post-conditions)
 */
export class InvariantError extends LogicError {
  constructor(message: string, context: ErrorContext = {}, userMessage?: string) {
    super(
      message,
      ErrorCategory.INVARIANT,
      ErrorSeverity.CRITICAL,
      context,
      false,
      userMessage || 'انتهاك قاعدة أساسية في المنطق'
    );
    this.name = 'InvariantError';
  }
}

/**
 * State machine violations
 */
export class StateError extends LogicError {
  constructor(message: string, context: ErrorContext = {}, userMessage?: string) {
    super(
      message,
      ErrorCategory.STATE,
      ErrorSeverity.HIGH,
      context,
      true,
      userMessage || 'الحالة الحالية للنظام غير صالحة'
    );
    this.name = 'StateError';
  }
}

/**
 * Algorithm execution errors
 */
export class AlgorithmError extends LogicError {
  constructor(message: string, context: ErrorContext = {}, userMessage?: string) {
    super(
      message,
      ErrorCategory.ALGORITHM,
      ErrorSeverity.HIGH,
      context,
      true,
      userMessage || 'فشل في تنفيذ العملية'
    );
    this.name = 'AlgorithmError';
  }
}

/**
 * Unexpected side effects
 */
export class SideEffectError extends LogicError {
  constructor(message: string, context: ErrorContext = {}, userMessage?: string) {
    super(
      message,
      ErrorCategory.SIDE_EFFECT,
      ErrorSeverity.MEDIUM,
      context,
      false,
      userMessage || 'تأثير جانبي غير متوقع'
    );
    this.name = 'SideEffectError';
  }
}

/**
 * Performance threshold violations
 */
export class PerformanceError extends LogicError {
  constructor(message: string, context: ErrorContext = {}, userMessage?: string) {
    super(
      message,
      ErrorCategory.PERFORMANCE,
      ErrorSeverity.MEDIUM,
      context,
      true,
      userMessage || 'تجاوز الحد المسموح للأداء'
    );
    this.name = 'PerformanceError';
  }
}

/**
 * Circuit breaker errors
 */
export class CircuitBreakerError extends LogicError {
  constructor(message: string, context: ErrorContext = {}, userMessage?: string) {
    super(
      message,
      ErrorCategory.CIRCUIT_BREAKER,
      ErrorSeverity.HIGH,
      context,
      true,
      userMessage || 'الخدمة غير متاحة مؤقتاً - يرجى المحاولة لاحقاً'
    );
    this.name = 'CircuitBreakerError';
  }
}