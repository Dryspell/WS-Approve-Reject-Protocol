export const perf = <T>(fn: () => T) => {
  const start = performance.now();
  const result = fn();
  console.log("Time taken: ", performance.now() - start);
  return result;
};
