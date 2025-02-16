/** @internal */
function getOption(key: string) {
  try {
    const value = localStorage.getItem(key);
    if (value) return value;
  } catch (e) {}
  try {
    const value = sessionStorage.getItem(key);
    if (value) return value;
  } catch (e) {}
}

/** @internal */
function isEnabled(type: string, namespace: string) {
  let exclude = getOption(type + "_exclude");
  let include = getOption(type + "_include");
  try {
    if (exclude && namespace.match(exclude)) return false;
  } catch (e) {
    console.log(e);
  }
  try {
    if (include && namespace.match(include)) return true;
  } catch (e) {
    console.log(e);
  }
  return false;
}

/** @internal */
export function debug(namespace: string, filter?: (...any) => boolean) {
  const isDebug = isEnabled("debug", namespace);
  const isTrace = isEnabled("trace", namespace);

  if (!isDebug) {
    return () => {
      // no operation
    };
  }

  return (...args) => {
    if (filter && !filter(...args)) {
      return;
    }
    console.log(namespace, ...args);
    isTrace && console.trace();
  };
}

/** @internal */
export function watch<T extends object>(namespace: string, target: T): T {
  const isWatch = isEnabled("watch", namespace);
  const isTrace = isEnabled("trace", namespace);

  if (!isWatch) {
    return target;
  }

  return new Proxy(target, {
    set(obj, prop, value, receiver) {
      console.debug(namespace, ".", prop.toString(), obj[prop], "↬", value);
      isTrace && console.trace();
      return Reflect.set(obj, prop, value, receiver);
    },
  });
}
