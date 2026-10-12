export interface IterationRow {
  iteration: number;
  lower: number;
  upper: number;
  estimate: number;
  functionValue: number;
  change: number | null;
}

export interface SolverResult {
  method: string;
  expression: string;
  root: number;
  functionValue: number;
  iterations: number;
  status: "converged" | "max_iterations" | "stagnated";
  message: string;
  rows: IterationRow[];
}