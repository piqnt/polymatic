/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export interface DriverConfig<D, R> {
  /** Return true for data this driver handles */
  filter: (d: any) => boolean;
  /** Called when data is added, create and return a component for it, or null if there is none */
  enter: (d: D) => R | null;
  /** Called when data is removed, clean up its component */
  exit: (d: D, ref: R) => void;
  /** Called on every data pass, including the pass where data was added, sync the component with data */
  update: (d: D, ref: R) => void;
}

/**
 * Creates, updates and removes a component for each data handled by this driver.
 *
 * If `enter` returns null, there is no component for that data, and `update` and `exit` are not called for it.
 */
export abstract class Driver<E extends object, C> {
  /** @internal */ _componentsById: Record<string, C> = {};

  /** Return true for data this driver handles */
  abstract filter(d: E): boolean;
  /** Called when data is added, create and return a component for it, or null if there is none */
  abstract enter(d: E): C | null;
  /** Called when data is removed, clean up its component */
  abstract exit(d: E, ref: C): void;
  /** Called on every data pass, including the pass where data was added, sync the component with data */
  abstract update(d: E, ref: C): void;

  /** Create a driver from plain functions, instead of extending this class */
  static create<E extends object, C>(config: DriverConfig<E, C>): Driver<E, C> {
    return new (class extends Driver<E, C> {
      filter = config.filter;
      enter = config.enter;
      exit = config.exit;
      update = config.update;
    })();
  }

  /** The component for the given key, or undefined if there is none */
  ref(key: string): C | undefined {
    return this._componentsById[key];
  }
}

export interface BinderConfig<E extends object> {
  /** Uniquely identifies data between passes, see {@link Binder.key} */
  key: (e: E) => string;
  drivers?: Driver<E, any>[];
}

/**
 * Tracks data between passes, and calls driver functions for data that entered, updated or exited.
 */
export abstract class Binder<E extends object> {
  /** Create a binder from plain functions, instead of extending this class */
  static create<E extends object>(config: BinderConfig<E>): Binder<E> {
    return new (class extends Binder<E> {
      key = config.key;
      _drivers = config.drivers ? [...config.drivers] : [];
    })();
  }

  /** @internal */ _drivers: Driver<E, any>[] = [];

  /**
   * Uniquely identifies data between passes.
   *
   * Keys must be non-empty strings, and unique within each pass. Data with an invalid or duplicate key
   * is ignored with a warning. The key of data should not change while it is in the binder.
   */
  abstract key(d: E): string;

  /** @hidden @deprecated Use config.drivers */
  addDriver<R>(driver: Driver<E, R>): Binder<E> {
    const isValid = driver && driver.filter && driver.enter && driver.exit && driver.update;
    if (!isValid) throw "Invalid driver: " + driver;
    this._drivers.push(driver);
    return this;
  }

  /** @internal */ _map: Record<string, E> = {};

  /** @internal */ _mapBuffer: Record<string, E> = {};
  /** @internal */ _updateBuffer: E[] = [];
  /** @internal */ _updateKeys: string[] = [];
  /** @internal */ _enterBuffer: E[] = [];
  /** @internal */ _enterKeys: string[] = [];
  /** @internal */ _exitBuffer: E[] = [];
  /** @internal */ _exitKeys: string[] = [];

  /** @hidden @deprecated Use setData */
  data(data: (E | undefined | null)[]) {
    this.setData(data);
  }

  /**
   * Pass the current data, and the binder calls driver functions for data
   * that entered, updated or exited since the last pass.
   */
  setData(data: (E | undefined | null)[]) {
    // todo: use diff-match-patch instead of map?
    if (!Array.isArray(data)) throw "Invalid data: " + data;

    this._enterBuffer.length = 0;
    this._enterKeys.length = 0;
    this._exitBuffer.length = 0;
    this._exitKeys.length = 0;
    this._updateBuffer.length = data.length;
    this._updateKeys.length = data.length;

    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      if (typeof d !== "object" || d === null) continue;
      const id = this.key(d);
      if (!isValidKey(id)) {
        console.warn("Invalid key, data is ignored: " + id, d);
        continue;
      }
      // _mapBuffer is empty at this point, so this only matches keys added in this pass
      if (this._mapBuffer[id]) {
        console.warn("Duplicate key, data is ignored: " + id, d);
        continue;
      }
      if (!this._map[id]) {
        this._enterBuffer.push(d);
        this._enterKeys.push(id);
      } else {
        delete this._map[id];
      }
      this._updateBuffer[i] = d;
      this._updateKeys[i] = id;
      this._mapBuffer[id] = d;
    }

    for (const id in this._map) {
      this._exitBuffer.push(this._map[id]);
      // keys are taken from the map, in case key() has changed since data was added
      this._exitKeys.push(id);
      delete this._map[id];
    }

    const temp = this._map;
    this._map = this._mapBuffer;
    this._mapBuffer = temp;

    for (let i = 0; i < this._exitBuffer.length; i++) {
      const d = this._exitBuffer[i];
      const key = this._exitKeys[i];
      for (const driver of this._drivers) {
        if (driver.filter(d)) {
          const ref = driver._componentsById[key];
          // ref is undefined if enter returned null
          if (ref !== undefined) driver.exit(d, ref);
        }
        delete driver._componentsById[key];
      }
    }

    for (let i = 0; i < this._enterBuffer.length; i++) {
      const d = this._enterBuffer[i];
      const key = this._enterKeys[i];
      for (const driver of this._drivers) {
        if (driver.filter(d)) {
          const ref = driver.enter(d);
          if (ref) {
            driver._componentsById[key] = ref;
          }
        }
      }
    }

    for (let i = 0; i < this._updateBuffer.length; i++) {
      const d = this._updateBuffer[i];
      // undefined if data was not an object, or key was invalid or duplicate
      if (d === undefined) continue;
      const key = this._updateKeys[i];
      for (const driver of this._drivers) {
        if (driver.filter(d)) {
          const ref = driver._componentsById[key];
          // ref is undefined if enter returned null
          if (ref !== undefined) driver.update(d, ref);
        }
      }
    }

    this._enterBuffer.length = 0;
    this._enterKeys.length = 0;
    this._exitBuffer.length = 0;
    this._exitKeys.length = 0;
    this._updateBuffer.length = 0;
    this._updateKeys.length = 0;
  }
}

function isValidKey(key: unknown): key is string {
  if (typeof key === "string") return key !== "";
  // numbers are coerced to string when used as object keys
  if (typeof key === "number") return key === key;
  return false;
}

// todo: mark as deprecated
export { Binder as Dataset };
