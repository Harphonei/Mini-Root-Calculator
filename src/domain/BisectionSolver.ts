import { RootSolver } from "./RootSolver";

export class BisectionSolver extends RootSolver {
  readonly name = "Bisection";

  protected override nextEstimate(
    lower: number,
    upper: number,
    _fLower: number,
    _fUpper: number
  ): number {
    return lower / 2 + upper / 2;
  }
}