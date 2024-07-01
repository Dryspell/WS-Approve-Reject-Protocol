type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never;

type NoUnion<Key> =
  // If this is a simple type UnionToIntersection<Key> will be the same type,
  // otherwise it will an intersection of all types in the union and probably
  // will not extend `Key`
  [Key] extends [UnionToIntersection<Key>] ? Key : never;

const testInput1 = [
  { id: "game1", name: "Game Room 1" },
  { id: "game2", name: "Game Room 2" },
];
const testInput2 = [{ id: "game1", name: "Game Room 1" }, { id: "game2" }];

const AOStoSOA = <T, TLen>(objs: T extends NoUnion<T> & Record<string, unknown> ? T[] : never) => {
  return objs.reduce(
    (acc, obj) => {
      Object.entries(obj).forEach(([key, value]) => {
        // @ts-ignore
        if (!acc[key]) {
          // @ts-ignore
          acc[key] = [];
        }
        // @ts-ignore
        acc[key].push(value);
      });
      return acc;
    },
    {} as {
      [K in keyof T]: {
        key: K;
        value: T[K][];
      } extends infer Entries extends {
        key: string;
        value: unknown[];
      }
        ? Entries["value"]
        : never;
    },
  );
};

AOStoSOA(testInput1);
// AOStoSOA(testInput2); -- fails as expected
