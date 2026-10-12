import { Equation } from "./Equation";
import { SolverConfig } from "./SolverConfig";
import type { IterationRow, SolverResult } from "./SolverResult";

export abstract class RootSolver {
  abstract readonly name: string;

  protected readonly equation: Equation;
  protected readonly config: SolverConfig;

  constructor(equation: Equation, config: SolverConfig) {
    this.equation = equation;
    this.config = config;
  }

  protected abstract nextEstimate(
    lower: number,
    upper: number,
    fLower: number,
    fUpper: number
  ): number;

  solve(): SolverResult {
    let lower = this.config.getLower();
    let upper = this.config.getUpper();
    let fLower = this.equation.evaluate(lower);
    let fUpper = this.equation.evaluate(upper);
    const rows: IterationRow[] = [];

    if (fLower === 0) {
      return this.createResult(
        lower, fLower, rows, "converged", "Root found at lower bound."
      );
    }

    if (fUpper === 0) {
      return this.createResult(
        upper, fUpper, rows, "converged", "Root found at upper bound."
      );
    }

    if (Math.sign(fLower) === Math.sign(fUpper)) {
      throw new Error(
        "The interval must have opposite signs at its endpoints."
      );
    }

    let previous: number | null = null;
    let estimate = lower;
    let functionValue = fLower;

    for (
      let iteration = 1;
      iteration <= this.config.getMaxIterations();
      iteration++
    ) {
      estimate = this.nextEstimate(lower, upper, fLower, fUpper);

      if (
        !Number.isFinite(estimate) ||
        estimate < lower ||
        estimate > upper
      ) {
        throw new Error("The method produced an invalid estimate.");
      }

      functionValue = this.equation.evaluate(estimate);

      rows.push({
        iteration,
        lower,
        upper,
        estimate,
        functionValue,
        change: previous === null
          ? null
          : Math.abs(estimate - previous)
      });

      if (Math.abs(functionValue) <= this.config.getTolerance()) {
        return this.createResult(
          estimate,
          functionValue,
          rows,
          "converged",
          "Function tolerance reached."
        );
      }

      if (
        estimate === previous ||
        estimate === lower ||
        estimate === upper
      ) {
        return this.createResult(
          estimate,
          functionValue,
          rows,
          "stagnated",
          "Estimate stopped changing before tolerance was reached."
        );
      }

      if (Math.sign(fLower) !== Math.sign(functionValue)) {
        upper = estimate;
        fUpper = functionValue;
      } else {
        lower = estimate;
        fLower = functionValue;
      }

      previous = estimate;
    }

    return this.createResult(
      estimate,
      functionValue,
      rows,
      "max_iterations",
      "Maximum iterations reached before tolerance was satisfied."
    );
  }

  private createResult(
    root: number,
    functionValue: number,
    rows: IterationRow[],
    status: SolverResult["status"],
    message: string
  ): SolverResult {
    return {
      method: this.name,
      expression: this.equation.getExpression(),
      root,
      functionValue,
      iterations: rows.length,
      status,
      message,
      rows
    };
  }
}