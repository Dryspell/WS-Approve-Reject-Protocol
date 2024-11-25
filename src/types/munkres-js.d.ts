declare module "munkres-js" {
  /**
   * Represents a cost matrix used for the assignment problem.
   * The matrix is a 2D array where each element is a number representing the cost.
   */
  type CostMatrix = number[][];

  export default function munkres(
    matrix: CostMatrix,
  ): [worker: number, job: number][];
}
