/**
 * @PixoRA/logic-guardian
 * Production-grade logic and algorithm error detection system
 * 
 * Core Features:
 * 1. Schema Validation (Zod integration)
 * 2. Algorithm Invariants (pre/post-conditions)
 * 3. State Machine Validation
 * 4. Side-Effect Tracking
 * 5. Circuit Breaker Pattern
 * 6. Performance Monitoring
 * 7. Custom Error Classes
 */

export * from './core/errors';
export * from './core/validator';
export * from './core/invariants';
export * from './core/circuitBreaker';
export * from './core/stateGuard';
export * from './core/sideEffectTracker';
export * from './utils/logger';

// Re-export main facade and its functions
export { LogicGuardian, getGuardian, resetGuardian } from './LogicGuardian';
export type { LogicGuardianConfig } from './LogicGuardian';