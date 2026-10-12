import { Equation } from "./Equation";
import { SolverConfig } from "./SolverConfig";
import { BisectionSolver } from "./BisectionSolver";
import { FalsePositionSolver } from "./FalsePositionSolver";

export function runSolverChecks(): string[] {
  const messages: string[] = [];

  function check(name: string, test: () => void): void {
    try {
      test();
      messages.push(`PASS: ${name}`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      messages.push(`FAIL: ${name} — ${detail}`);
    }
  }

  function expectError(action: () => void): void {
    let rejected = false;
    try {
      action();
    } catch {
      rejected = true;
    }
    if (!rejected) {
      throw new Error("Expected the input to be rejected.");
    }
  }

  const methods = [BisectionSolver, FalsePositionSolver];

  const cases = [
    {
      expression: "x^2 - 2",
      lower: 1,
      upper: 2,
      expected: Math.sqrt(2)
    },
    {
      expression: "cos(x) - x",
      lower: 0,
      upper: 1,
      expected: 0.7390851332151607
    }
  ];

  for (const Method of methods) {
    for (const sample of cases) {
      check(`${Method.name}: ${sample.expression}`, () => {
        const solver = new Method(
          new Equation(sample.expression),
          new SolverConfig(sample.lower, sample.upper, 1e-8, 200)
        );
        const result = solver.solve();

        if (result.status !== "converged") {
          throw new Error(result.message);
        }
        if (Math.abs(result.root - sample.expected) > 1e-7) {
          throw new Error("Root differs from the reference value.");
        }
        if (Math.abs(result.functionValue) > 1e-8) {
          throw new Error("Function tolerance was not satisfied.");
        }
        if (result.rows.length !== result.iterations) {
          throw new Error("Iteration count does not match the table.");
        }
      });
    }

    check(`${Method.name}: endpoint root`, () => {
      const result = new Method(
        new Equation("x - 1"),
        new SolverConfig(1, 2, 1e-8, 100)
      ).solve();

      if (result.root !== 1 || result.iterations !== 0) {
        throw new Error("Endpoint root was not handled correctly.");
      }
    });

    check(`${Method.name}: invalid bracket`, () => {
      expectError(() => new Method(
        new Equation("x^2 + 1"),
        new SolverConfig(-1, 1, 1e-8, 100)
      ).solve());
    });

    check(`${Method.name}: iteration limit`, () => {
      const result = new Method(
        new Equation("x^2 - 2"),
        new SolverConfig(1, 2, 1e-12, 1)
      ).solve();

      if (result.status !== "max_iterations" || result.iterations !== 1) {
        throw new Error("Iteration limit was not handled correctly.");
      }
    });
  }

  check("Reject another variable", () => {
    expectError(() => new Equation("y + 1"));
  });

  check("Reject assignment", () => {
    expectError(() => new Equation("x = 2"));
  });

  check("Reject non-real result", () => {
    expectError(() => new Equation("sqrt(x)").evaluate(-1));
  });

  check("Reject division by zero", () => {
    expectError(() => new Equation("1/x").evaluate(0));
  });

  check("Reject invalid configuration", () => {
    expectError(() => new SolverConfig(2, 1, 1e-8, 100));
  });

  return messages;
}