import {HandledException} from './HandledException.js';

/**
 * ExceptionHandler class for flexible exception handling.
 * Supports handling exceptions based on their name with configurable strict mode.
 *
 * ### Resolution Mechanism:
 * The `ExceptionHandler` resolves exceptions based on the following precedence order:
 *
 * 1. **Manual Resolver by Name**:
 *    - Resolves exceptions using their `name` property as the key.
 *    - This is the most specific resolution mechanism and ensures that manually registered
 *      resolvers are prioritized.
 *
 * 2. **HandledException Built-in Handler**:
 *    - If the exception extends `HandledException` and no manual resolver is found, the `getHandler`
 *      method of the `HandledException` is used to resolve it.
 *
 * 3. **Rethrow**:
 *    - If no resolver or built-in handler is found, the exception is rethrown.
 *
 * - **Duplicate Name**:
 *   - If the same `name` is registered again, a warning is logged, and the insertion is skipped.
 */
export class ExceptionHandler {
  /**
   * Creates an instance of ExceptionHandler.
   * @param {boolean} strictMode - If true, only HandledException instances are handled (default: false).
   */
  constructor(strictMode = false) {
    this.exceptionResolvers = new Map();
    this.strictMode = strictMode;
  }

  /**
   * Registers a resolver for a specific exception name.
   * Logs a warning if strict mode is enabled and the exception does not extend HandledException.
   * @param {Function} exceptionType - The exception class.
   * @param {Function|any} resolver - The resolver function or static response for the exception.
   * @return {ExceptionHandler} The instance for chaining.
   */
  register(exceptionType, resolver) {
    const name = exceptionType.name;

    if (this.strictMode) {
      // Check if the exception extends HandledException
      if (!(exceptionType.prototype instanceof HandledException)) {
        console.warn(
            `Warning: Attempted to register "${name}" in strict mode. This exception does not extend HandledException and will not be handled when in strict mode.`,
        );
        return this; // Prevent registration in strict mode
      }
    }

    // Check for duplicate registration
    if (this.exceptionResolvers.has(name)) {
      console.warn(`Warning: Attempted duplicate registration for exception name "${name}".`);
    }

    // Register the resolver by name
    this.exceptionResolvers.set(name, resolver);

    return this; // Enable chaining
  }

  /**
   * Executes a function and handles exceptions based on registered mappings.
   * Matches exceptions by their name and invokes the corresponding resolver.
   * @param {Function} fn - The function to execute.
   * @return {Promise<any>} The result of the function or the resolved response.
   */
  async wrap(fn) {
    try {
      return await fn();
    } catch (error) {
      // Attempt to resolve by name
      const resolver = this.exceptionResolvers.get(error.constructor.name);

      if (resolver) {
        // Log trace if manually registered resolver takes precedence
        if (error instanceof HandledException) {
          console.trace(
              `Manually registered resolver for exception "${error.name}" is taking precedence over HandledException's built-in handler.`,
          );
        }

        // Resolve the exception using the registered resolver
        return typeof resolver === 'function' ? resolver(error) : resolver;
      }

      // Handle HandledException if no manual resolver is registered
      if (error instanceof HandledException) {
        const handler = error.getHandler();
        return typeof handler === 'function' ? handler(error) : handler;
      }

      // If no resolver is found, rethrow the exception
      throw error;
    }
  }
}
