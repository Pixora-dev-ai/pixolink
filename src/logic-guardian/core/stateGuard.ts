import { StateError } from './errors';

/**
 * State Machine Validator
 * Ensures valid state transitions and prevents invalid states
 */

export type StateTransition<S extends string> = {
  from: S;
  to: S;
  condition?: () => boolean;
  onTransition?: (from: S, to: S) => void | Promise<void>;
};

export interface StateMachineConfig<S extends string> {
  initialState: S;
  states: readonly S[];
  transitions: StateTransition<S>[];
  onInvalidTransition?: (from: S, to: S) => void;
}

/**
 * Finite State Machine with validation
 */
export class StateMachine<S extends string> {
  private currentState: S;
  private readonly config: StateMachineConfig<S>;
  private transitionHistory: Array<{ from: S; to: S; timestamp: number }> = [];

  constructor(config: StateMachineConfig<S>) {
    this.config = config;
    this.currentState = config.initialState;

    // Validate initial state
    if (!config.states.includes(config.initialState)) {
      throw new StateError(
        `Initial state "${config.initialState}" not in valid states`,
        { expected: config.states, actual: config.initialState }
      );
    }
  }

  /**
   * Get current state
   */
  public getState(): S {
    return this.currentState;
  }

  /**
   * Check if transition is valid
   */
  public canTransitionTo(targetState: S): boolean {
    const transition = this.config.transitions.find(
      t => t.from === this.currentState && t.to === targetState
    );

    if (!transition) return false;
    if (transition.condition) return transition.condition();
    return true;
  }

  /**
   * Transition to new state
   */
  public async transitionTo(targetState: S, force: boolean = false): Promise<void> {
    if (!this.config.states.includes(targetState)) {
      throw new StateError(
        `Target state "${targetState}" not in valid states`,
        { expected: this.config.states, actual: targetState }
      );
    }

    const transition = this.config.transitions.find(
      t => t.from === this.currentState && t.to === targetState
    );

    if (!transition && !force) {
      const error = new StateError(
        `Invalid transition from "${this.currentState}" to "${targetState}"`,
        {
          state: { current: this.currentState, target: targetState },
          metadata: { availableTransitions: this.getAvailableTransitions() }
        }
      );

      if (this.config.onInvalidTransition) {
        this.config.onInvalidTransition(this.currentState, targetState);
      }

      throw error;
    }

    // Check condition
    if (transition?.condition && !transition.condition()) {
      throw new StateError(
        `Transition condition not met for "${this.currentState}" -> "${targetState}"`,
        { state: { current: this.currentState, target: targetState } }
      );
    }

    const previousState = this.currentState;

    // Execute transition callback
    if (transition?.onTransition) {
      await transition.onTransition(this.currentState, targetState);
    }

    // Update state
    this.currentState = targetState;

    // Record history
    this.transitionHistory.push({
      from: previousState,
      to: targetState,
      timestamp: Date.now()
    });
  }

  /**
   * Get available transitions from current state
   */
  public getAvailableTransitions(): S[] {
    return this.config.transitions
      .filter(t => t.from === this.currentState)
      .filter(t => !t.condition || t.condition())
      .map(t => t.to);
  }

  /**
   * Get transition history
   */
  public getHistory(): Array<{ from: S; to: S; timestamp: number }> {
    return [...this.transitionHistory];
  }

  /**
   * Reset to initial state
   */
  public reset(): void {
    this.currentState = this.config.initialState;
    this.transitionHistory = [];
  }

  /**
   * Check if in specific state
   */
  public isInState(state: S): boolean {
    return this.currentState === state;
  }

  /**
   * Check if in one of multiple states
   */
  public isInOneOf(states: S[]): boolean {
    return states.includes(this.currentState);
  }
}

/**
 * State guard decorator for methods
 */
export function requireState<S extends string>(...allowedStates: S[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = function (this: any, ...args: any[]) {
      // Assuming the class has a `stateMachine` property
      if (this.stateMachine instanceof StateMachine) {
        const currentState = this.stateMachine.getState();
        
        if (!allowedStates.includes(currentState as S)) {
          throw new StateError(
            `Method "${propertyKey}" requires state to be one of [${allowedStates.join(', ')}], but current state is "${currentState}"`,
            {
              state: { current: currentState, required: allowedStates },
              metadata: { method: propertyKey }
            }
          );
        }
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}