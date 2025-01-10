/**
 * Abstract base class for exceptions that can be mapped to handlers.
 * Users must extend this class to define custom exceptions with predefined responses or actions.
 */
export class HandledException extends Error {
  /**
   * Constructor for a mappable exception.
   * @param {string} message - The error message.
   */
  constructor(message) {
    super(message);

    // Ensure the class is not directly instantiated
    if (new.target === HandledException) {
      throw new Error('HandledException is an abstract class and cannot be instantiated directly.');
    }

    this.name = this.constructor.name;

    // Ensure subclasses define a handler
    if (!this.getHandler || typeof this.getHandler !== 'function') {
      throw new Error(`Subclasses of HandledException must implement a "getHandler" method.`);
    }

    // Validate that the handler is defined
    const handler = this.getHandler();
    if (!handler) {
      throw new Error(`The "getHandler" method in "${this.constructor.name}" must return a handler.`);
    }
  }

  /**
   * Abstract method to retrieve the handler for this exception.
   * Subclasses must implement this method.
   * @abstract
   * @return {Function|any} The handler function or static response.
   */
  getHandler() {
    throw new Error('Subclasses of HandledException must implement the "getHandler" method.');
  }
}
