/// <reference types="@solidjs/start/env" />
interface ObjectConstructor {
  entries<T extends {}>(
    object: T,
  ): keyof T extends never
    ? []
    : Array<
        {
          [K in keyof T]-?: {
            key: K;
            value: [K, T[K]];
          };
        }[keyof T] extends infer Entry extends {
          key: keyof T;
          value: unknown;
        }
          ? Entry["value"]
          : never
      >;
}
