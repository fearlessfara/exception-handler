/* eslint-disable */
import {expect} from 'chai';
import {HandledException} from '../src/HandledException.js';

describe('HandledException', () => {
  it('should throw an error if instantiated directly', () => {
    expect(() => {
      new HandledException('Direct instantiation');
    }).to.throw('HandledException is an abstract class and cannot be instantiated directly.');
  });

  it('should throw an error if a subclass does not implement getHandler', () => {
    class NoHandlerError extends HandledException {
      constructor(message) {
        super(message);
      }
    }

    expect(() => {
      new NoHandlerError('No handler implementation');
    }).to.throw('Subclasses of HandledException must implement the "getHandler" method.');
  });

  it('should throw an error if getHandler returns undefined or null', () => {
    class InvalidHandlerError extends HandledException {
      constructor(message) {
        super(message);
      }

      getHandler() {
        return null; // Invalid handler
      }
    }

    expect(() => {
      new InvalidHandlerError('Invalid handler');
    }).to.throw('The "getHandler" method in "InvalidHandlerError" must return a handler.');
  });

  it('should allow instantiation if getHandler is implemented and returns a handler', () => {
    class ValidHandlerError extends HandledException {
      constructor(message) {
        super(message);
      }

      getHandler() {
        return (error) => ({message: error.message, code: 400});
      }
    }

    const errorInstance = new ValidHandlerError('Valid error');
    expect(errorInstance).to.be.instanceOf(HandledException);
    expect(errorInstance).to.be.instanceOf(ValidHandlerError);
    expect(errorInstance.getHandler()).to.be.a('function');
    expect(errorInstance.message).to.equal('Valid error');
  });

  it('should allow static responses as a handler', () => {
    class StaticHandlerError extends HandledException {
      constructor(message) {
        super(message);
      }

      getHandler() {
        return {message: 'Static response', code: 500};
      }
    }

    const errorInstance = new StaticHandlerError('Static error');
    expect(errorInstance).to.be.instanceOf(HandledException);
    expect(errorInstance).to.be.instanceOf(StaticHandlerError);
    const handler = errorInstance.getHandler();
    expect(handler).to.deep.equal({message: 'Static response', code: 500});
  });

  it('should assign the correct name and message to the exception', () => {
    class CustomError extends HandledException {
      constructor(message) {
        super(message);
      }

      getHandler() {
        return {message: 'Handler message', code: 400};
      }
    }

    const errorInstance = new CustomError('Custom error occurred');
    expect(errorInstance.name).to.equal('CustomError');
    expect(errorInstance.message).to.equal('Custom error occurred');
  });
});
