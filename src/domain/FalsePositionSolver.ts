import { RootSolver } from "./RootSolver";

export class FalsePositionSolver extends RootSolver {
  readonly name = "False Position";

  protected override nextEstimate(
    lower: number,
    upper: number,
    fLower: number,
    fUpper: number
  ): number {
    const scale = Math.max(Math.abs(fLower), Math.abs(fUpper));

    if (scale === 0 || !Number.isFinite(scale)) {
      throw new Error("Cannot calculate the interpolation weight.");
    }

    const leftMagnitude = Math.abs(fLower) / scale;
    const rightMagnitude = Math.abs(fUpper) / scale;
    const weight = leftMagnitude / (leftMagnitude + rightMagnitude);

    return (1 - weight) * lower + weight * upper;
  }
}