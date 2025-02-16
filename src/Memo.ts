/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class Memo {
  static init(...args: any[]) {
    const memo = new Memo();
    if (args.length) memo.update(...args);
    return memo;
  }

  private memory: any = [];

  /**
   * Returns true if args are updated.
   */
  update(...args: any[]) {
    let equal = this.memory.length === args.length;
    for (let i = 0; i < args.length; i++) {
      equal = equal && this.memory[i] === args[i];
      this.memory[i] = args[i];
    }
    this.memory.length = args.length;
    return !equal;
  }

  clear() {
    this.memory.length = 0;
  }
}
