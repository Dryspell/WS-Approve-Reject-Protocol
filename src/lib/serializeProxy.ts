export const serializeProxy = <T extends Record<string, unknown>>(obj: T) => {
  const serialized: unknown[] = Object.entries(obj)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      if (typeof value === "object" && value !== null) {
        return serializeProxy(value as Record<string, unknown>);
      }
      return value;
    });

  return new Proxy(serialized, {
    get(target, prop) {
      if (prop === "toJSON") return () => target;
      if (prop in obj && typeof prop === "string") {
        const index = Object.keys(obj)
          .sort((a, b) => a.localeCompare(b))
          .indexOf(prop);
        console.log(index, serialized[index]);
        return serialized[index];
      }
      return undefined;
    },
    ownKeys(target) {
      return Object.keys(obj).sort((a, b) => a.localeCompare(b));
    },
    set(target, prop, newValue) {
      obj[prop as keyof T] = newValue;
      if (prop in obj && typeof prop === "string") {
        const index = Object.keys(obj)
          .sort((a, b) => a.localeCompare(b))
          .indexOf(prop);
        serialized[index] = newValue;
      }
      return true;
    },
  }) as unknown as T;
};
