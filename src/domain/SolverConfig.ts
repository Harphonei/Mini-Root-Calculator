export class SolverConfig {
  private readonly lower: number;
  private readonly upper: number;
  private readonly tolerance: number;
  private readonly maxIterations: number;

  constructor(
    lower: number,
    upper: number,
    tolerance: number,
    maxIterations: number
  ) {
    if (![lower, upper, tolerance, maxIterations].every(Number.isFinite)) {
      throw new Error("All inputs must be finite numbers.");
    }
    if (lower >= upper) {
      throw new Error("Lower bound must be less than upper bound.");
    }
    if (tolerance <= 0) {
      throw new Error("Tolerance must be greater than zero.");
    }
    if (
      !Number.isInteger(maxIterations) ||
      maxIterations < 1 ||
      maxIterations > 500
    ) {
      throw new Error("Max iterations must be an integer from 1 to 500.");
    }

    this.lower = lower;
    this.upper = upper;
    this.tolerance = tolerance;
    this.maxIterations = maxIterations;
  }

  getLower(): number {
    return this.lower;
  }

  getUpper(): number {
    return this.upper;
  }

  getTolerance(): number {
    return this.tolerance;
  }

  getMaxIterations(): number {
    return this.maxIterations;
  }
}