/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export interface DriverConfig<D, R> {
  filter: (d: any) => boolean;
  enter: (d: D) => R | null;
  exit: (d: D, ref: R) => void;
  update: (d: D, ref: R) => void;
}

export abstract class Driver<E extends object, C> {
  /** @internal */ _componentsById: Record<string, C> = {};

  abstract filter(d: E): boolean;
  abstract enter(d: E): C | null;
  abstract exit(d: E, ref: C): void;
  abstract update(d: E, ref: C): void;

  static create<E extends object, C>(config: DriverConfig<E, C>) {
    return new (class extends Driver<E, C> {
      filter = config.filter;
      enter = config.enter;
      exit = config.exit;
      update = config.update;
    })();
  }

  ref(key: string): C | undefined {
    return this._componentsById[key];
  }
}

export interface DatasetConfig<D> {
  key: (d: D) => string;
}

export abstract class Dataset<E extends object> {
  static create<E extends object>(config: DatasetConfig<E>) {
    return new (class extends Dataset<E> {
      key = config.key;
    })();
  }

  /** @internal */ _drivers: Driver<E, any>[] = [];

  abstract key(d: E): string;

  addDriver<R>(driver: Driver<E, R>) {
    const isValid = driver && driver.filter && driver.enter && driver.exit && driver.update;
    if (!isValid) throw "Invalid driver: " + driver;
    this._drivers.push(driver);
    return this;
  }

  /** @internal */ _map: Record<string, E> = {};

  /** @internal */ _mapBuffer: Record<string, E> = {};
  /** @internal */ _updateBuffer: E[] = [];
  /** @internal */ _enterBuffer: E[] = [];
  /** @internal */ _exitBuffer: E[] = [];

  data(data: (E | undefined | null)[]) {
    // todo: use diff-match-patch instead of map?
    if (!Array.isArray(data)) throw "Invalid data: " + data;

    this._enterBuffer.length = 0;
    this._exitBuffer.length = 0;
    this._updateBuffer.length = data.length;

    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      if (typeof d !== "object" || d === null) continue;
      const id = this.key(d);
      if (!this._map[id]) {
        this._enterBuffer.push(d);
      } else {
        delete this._map[id];
      }
      this._updateBuffer[i] = d;
      this._mapBuffer[id] = d;
    }

    for (const id in this._map) {
      this._exitBuffer.push(this._map[id]);
      delete this._map[id];
    }

    const temp = this._map;
    this._map = this._mapBuffer;
    this._mapBuffer = temp;

    for (let i = 0; i < this._exitBuffer.length; i++) {
      const d = this._exitBuffer[i];
      const key = this.key(d);
      for (const driver of this._drivers) {
        if (driver.filter(d)) {
          const ref = driver._componentsById[key];
          driver.exit(d, ref);
        }
        delete driver._componentsById[key];
      }
    }

    for (let i = 0; i < this._enterBuffer.length; i++) {
      const d = this._enterBuffer[i];
      const key = this.key(d);
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
      if (typeof data[i] !== "object" || data[i] === null) continue;
      const d = this._updateBuffer[i];
      const key = this.key(d);
      for (const driver of this._drivers) {
        if (driver.filter(d)) {
          const ref = driver._componentsById[key];
          driver.update(d, ref);
        }
      }
    }

    this._enterBuffer.length = 0;
    this._exitBuffer.length = 0;
    this._updateBuffer.length = 0;
  }
}
