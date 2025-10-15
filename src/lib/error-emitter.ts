
import { EventEmitter } from 'events';
import type { FirestorePermissionError } from './errors';

type AppEvents = {
  'permission-error': (error: FirestorePermissionError) => void;
};

class TypedEventEmitter<T> {
  private emitter = new EventEmitter();

  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): boolean {
    return this.emitter.emit(event as string | symbol, ...args);
  }

  on<K extends keyof T>(event: K, listener: T[K]): this {
    this.emitter.on(event as string | symbol, listener as (...args: any[]) => void);
    return this;
  }
}

export const errorEmitter = new TypedEventEmitter<AppEvents>();
