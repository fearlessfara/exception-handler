/* eslint-disable */
import {expect} from 'chai';
import {InvalidEventError, CustomError} from './TestErrors.js';
import {ExceptionHandler} from '../src/ExceptionHandler.js';
import {HandledException} from '../src/HandledException.js';
import sinon from 'sinon';

describe('ExceptionHandler', () => {
  describe('Non-Strict Mode', () => {
    it('should handle registered exceptions with a custom response', async () => {
      const handler = new ExceptionHandler(false);
      handler.register(InvalidEventError, (error) => ({message: error.message, code: 400}));

      const fn = () => {
        throw new InvalidEventError('Invalid event detected!');
      };

      const result = await handler.wrap(fn);
      expect(result).to.deep.equal({message: 'Invalid event detected!', code: 400});
    });

    it('should handle generic Error exceptions if registered', async () => {
      const handler = new ExceptionHandler(false);
      handler.register(Error, (error) => ({message: `Generic handler: ${error.message}`, code: 500}));

      const fn = () => {
        throw new Error('A generic error occurred');
      };

      const result = await handler.wrap(fn);
      expect(result).to.deep.equal({message: 'Generic handler: A generic error occurred', code: 500});
    });

    it('should handle exceptions without a message property gracefully', async () => {
      class NoMessageError extends Error {
        constructor() {
          super();
          this.name = 'NoMessageError';
        }
      }

      const handler = new ExceptionHandler(false);
      handler.register(NoMessageError, {message: 'No message error handled', code: 400});

      const fn = () => {
        throw new NoMessageError();
      };

      const result = await handler.wrap(fn);
      expect(result).to.deep.equal({message: 'No message error handled', code: 400});
    });

    it('should handle sibling exception types independently', async () => {
      class BaseError extends Error {
        constructor(message) {
          super(message);
          this.name = 'BaseError';
        }
      }

      class SiblingError1 extends BaseError {
        constructor(message) {
          super(message);
          this.name = 'SiblingError1';
        }
      }

      class SiblingError2 extends BaseError {
        constructor(message) {
          super(message);
          this.name = 'SiblingError2';
        }
      }

      const handler = new ExceptionHandler(false);
      handler
          .register(SiblingError1, (error) => ({message: `Handled Sibling1: ${error.message}`, code: 401}))
          .register(SiblingError2, (error) => ({message: `Handled Sibling2: ${error.message}`, code: 402}));

      const result1 = await handler.wrap(() => {
        throw new SiblingError1('Issue with Sibling1');
      });
      const result2 = await handler.wrap(() => {
        throw new SiblingError2('Issue with Sibling2');
      });

      expect(result1).to.deep.equal({message: 'Handled Sibling1: Issue with Sibling1', code: 401});
      expect(result2).to.deep.equal({message: 'Handled Sibling2: Issue with Sibling2', code: 402});
    });

    it('should handle registered exceptions with a static response', async () => {
      const handler = new ExceptionHandler(false);
      handler.register(InvalidEventError, {message: 'Static response', code: 400});

      const fn = () => {
        throw new InvalidEventError('Invalid event detected!');
      };

      const result = await handler.wrap(fn);
      expect(result).to.deep.equal({message: 'Static response', code: 400});
    });

    it('should handle exceptions with additional properties', async () => {
      class DetailedError extends Error {
        constructor(message, details) {
          super(message);
          this.name = 'DetailedError';
          this.details = details;
        }
      }

      const handler = new ExceptionHandler(false);
      handler.register(DetailedError, (error) => ({
        message: error.message,
        details: error.details,
        code: 400,
      }));

      const fn = () => {
        throw new DetailedError('A detailed error occurred', {key: 'value'});
      };

      const result = await handler.wrap(fn);
      expect(result).to.deep.equal({
        message: 'A detailed error occurred',
        details: {key: 'value'},
        code: 400,
      });
    });

    it('should handle generic exceptions when Error is registered', async () => {
      const handler = new ExceptionHandler(false);
      handler.register(Error, (error) => ({message: `Generic handler: ${error.message}`, code: 500}));

      const fn = () => {
        throw new Error('A generic error occurred');
      };

      const result = await handler.wrap(fn);
      expect(result).to.deep.equal({message: 'Generic handler: A generic error occurred', code: 500});
    });
  });

  describe('Strict Mode', () => {
    it('should handle only HandledException types', async () => {
      class CustomHandledError extends HandledException {
        constructor(message) {
          super(message);
        }

        getHandler() {
          return (error) => ({message: `Handled: ${error.message}`, code: 400});
        }
      }

      const handler = new ExceptionHandler(true);
      handler.register(CustomHandledError, (error) => error.getHandler()(error));

      const fn = () => {
        throw new CustomHandledError('Handled error!');
      };

      const result = await handler.wrap(fn);
      expect(result).to.deep.equal({message: 'Handled: Handled error!', code: 400});
    });


    it('should not handle non-HandledException types even if registered', async () => {
      class AnotherError extends Error {
      }

      const handler = new ExceptionHandler(true);
      handler.register(AnotherError, {message: 'Should not be handled', code: 401});

      const fn = () => {
        throw new AnotherError('This should not be handled!');
      };

      try {
        await handler.wrap(fn);
      } catch (error) {
        expect(error).to.be.instanceOf(AnotherError);
        expect(error.message).to.equal('This should not be handled!');
      }
    });

    it('should log a warning when registering non-HandledException in strict mode', () => {
      const handler = new ExceptionHandler(true);

      const warnStub = sinon.stub(console, 'warn');

      class AnotherError extends Error {
      }

      handler.register(AnotherError, {message: 'Should not be handled', code: 401});
      expect(warnStub.calledWithMatch('Warning: Attempted to register')).to.be.true;
      warnStub.restore();
    });

    it('should handle multiple HandledException types', async () => {
      class FirstHandledError extends HandledException {
        constructor(message) {
          super(message);
        }

        getHandler() {
          return (error) => ({message: `Handled First: ${error.message}`, code: 400});
        }
      }

      class SecondHandledError extends HandledException {
        constructor(message) {
          super(message);
        }

        getHandler() {
          return (error) => ({message: `Handled Second: ${error.message}`, code: 401});
        }
      }

      const handler = new ExceptionHandler(true);
      handler.register(FirstHandledError, (error) => error.getHandler()(error));
      handler.register(SecondHandledError, (error) => error.getHandler()(error));

      const result1 = await handler.wrap(() => {
        throw new FirstHandledError('First error');
      });
      const result2 = await handler.wrap(() => {
        throw new SecondHandledError('Second error');
      });

      expect(result1).to.deep.equal({message: 'Handled First: First error', code: 400});
      expect(result2).to.deep.equal({message: 'Handled Second: Second error', code: 401});
    });

    it('should rethrow unregistered exceptions when in strict mode', async () => {
      class UnregisteredError extends Error {
        constructor(message) {
          super(message);
          this.name = 'UnregisteredError';
        }
      }

      const handler = new ExceptionHandler(true);

      const fn = () => {
        throw new UnregisteredError('This error is not registered');
      };

      try {
        await handler.wrap(fn);
      } catch (error) {
        expect(error).to.be.instanceOf(UnregisteredError);
        expect(error.message).to.equal('This error is not registered');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should allow chaining of multiple register calls', async () => {
      const handler = new ExceptionHandler(false)
          .register(InvalidEventError, (error) => ({message: error.message, code: 400}))
          .register(CustomError, {message: 'Custom error response', code: 500});

      const result = await handler.wrap(() => {
        throw new CustomError('This is a custom error');
      });
      expect(result).to.deep.equal({message: 'Custom error response', code: 500});
    });

    it('should throw an error when attempting to register duplicate resolvers', () => {
      const handler = new ExceptionHandler(false);
      handler.register(InvalidEventError, {message: 'Static response', code: 400});

      try {
        handler.register(InvalidEventError, {message: 'Duplicate static response', code: 400});
      } catch (error) {
        expect(error.message).to.equal('A resolver for the exception name "InvalidEventError" is already registered.');
      }
    });

    it('should handle asynchronous functions that throw exceptions', async () => {
      const handler = new ExceptionHandler(false);
      handler.register(InvalidEventError, (error) => ({message: error.message, code: 400}));

      const asyncFn = async () => {
        throw new InvalidEventError('Async error detected!');
      };

      const result = await handler.wrap(asyncFn);
      expect(result).to.deep.equal({message: 'Async error detected!', code: 400});
    });

    it('should rethrow unregistered exceptions in asynchronous functions', async () => {
      const handler = new ExceptionHandler(false);

      const asyncFn = async () => {
        throw new CustomError('Unhandled async error');
      };

      try {
        await handler.wrap(asyncFn);
      } catch (error) {
        expect(error).to.be.instanceOf(CustomError);
        expect(error.message).to.equal('Unhandled async error');
      }
    });

    it('should rethrow exceptions with custom names when not registered', async () => {
      class CustomNamedError extends Error {
        constructor(message) {
          super(message);
          this.name = 'CustomNamedError';
        }
      }

      const handler = new ExceptionHandler(false);

      const fn = () => {
        throw new CustomNamedError('Unhandled error');
      };

      try {
        await handler.wrap(fn);
      } catch (error) {
        expect(error).to.be.instanceOf(CustomNamedError);
        expect(error.message).to.equal('Unhandled error');
      }
    });

    it('should log a warning for duplicate registrations', () => {
      const handler = new ExceptionHandler(false);
      handler.register(InvalidEventError, {message: 'Static response', code: 400});

      const warnStub = sinon.stub(console, 'warn');

      handler.register(InvalidEventError, {message: 'Duplicate static response', code: 400});

      expect(warnStub.calledWithMatch('Warning: Attempted duplicate registration for exception name')).to.be.true;
      warnStub.restore();
    });

    it('should handle a mix of static and dynamic resolvers', async () => {
      const handler = new ExceptionHandler(false);
      handler
          .register(InvalidEventError, (error) => ({message: error.message, code: 400}))
          .register(CustomError, {message: 'Static custom response', code: 500});

      const fn1 = () => {
        throw new InvalidEventError('Invalid event');
      };
      const fn2 = () => {
        throw new CustomError('This should use static response');
      };

      const result1 = await handler.wrap(fn1);
      const result2 = await handler.wrap(fn2);

      expect(result1).to.deep.equal({message: 'Invalid event', code: 400});
      expect(result2).to.deep.equal({message: 'Static custom response', code: 500});
    });

    it('should prioritize manually registered resolver over HandledException built-in handler', async () => {
      class CustomHandledError extends HandledException {
        constructor(message) {
          super(message);
        }

        getHandler() {
          return {message: 'Handled by built-in handler', code: 400};
        }
      }

      const handler = new ExceptionHandler(false);

      // Spy on console.trace
      const traceSpy = sinon.spy(console, 'trace');

      // Register a manual resolver for CustomHandledError
      handler.register(CustomHandledError, (error) => ({message: `Handled manually: ${error.message}`, code: 401}));

      const fn = () => {
        throw new CustomHandledError('Test error');
      };

      const result = await handler.wrap(fn);

      // Assert the manual resolver took precedence
      expect(result).to.deep.equal({message: 'Handled manually: Test error', code: 401});

      // Assert the trace message was logged
      expect(traceSpy.calledWithMatch('Manually registered resolver for exception "CustomHandledError" is taking precedence over HandledException\'s built-in handler.')).to.be.true;

      traceSpy.restore();
    });

    it('should use HandledException built-in handler if no manual resolver is registered', async () => {
      class CustomHandledError extends HandledException {
        constructor(message) {
          super(message);
        }

        getHandler() {
          return {message: 'Handled by built-in handler', code: 400};
        }
      }

      const handler = new ExceptionHandler(false);

      const fn = () => {
        throw new CustomHandledError('Test error');
      };

      const result = await handler.wrap(fn);

      // Assert the built-in handler was used
      expect(result).to.deep.equal({message: 'Handled by built-in handler', code: 400});
    });

    it('should rethrow unhandled exceptions even if they are instances of HandledException', async () => {
      class CustomHandledError extends HandledException {
        constructor(message) {
          super(message);
        }

        getHandler() {
          return {message: 'Handled by built-in handler', code: 400};
        }
      }

      const handler = new ExceptionHandler(false);

      const fn = () => {
        throw new Error('Unhandled error');
      };

      try {
        await handler.wrap(fn);
      } catch (error) {
        expect(error.message).to.equal('Unhandled error');
      }
    });
  });
});
