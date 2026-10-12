import { parse } from "mathjs";
import type {
  ConstantNode,
  EvalFunction,
  FunctionNode,
  OperatorNode,
  SymbolNode
} from "mathjs";

const FUNCTIONS = new Set([
  "sin", "cos", "exp", "log", "sqrt"
]);

const OPERATORS = new Set([
  "add", "subtract", "multiply", "divide",
  "pow", "unaryMinus", "unaryPlus"
]);

export class Equation {
  private readonly expression: string;
  private readonly compiled: EvalFunction;

  constructor(expression: string) {
    this.expression = expression.trim();

    if (
      this.expression.length === 0 ||
      this.expression.length > 200
    ) {
      throw new Error("Enter an expression from 1 to 200 characters.");
    }

    if (/[=;#\r\n]/.test(this.expression)) {
      throw new Error("Enter only f(x), without =, comments or multiple lines.");
    }

    let tree;
    try {
      tree = parse(this.expression);
    } catch {
      throw new Error("Invalid expression. Check operators and parentheses.");
    }

    let count = 0;

    tree.traverse((node, _path, parent) => {
      count++;
      if (count > 100) {
        throw new Error("Expression is too complicated.");
      }

      switch (node.type) {
        case "ConstantNode": {
          const value = (node as ConstantNode).value;
          if (typeof value !== "number" || !Number.isFinite(value)) {
            throw new Error("Only finite numeric constants are allowed.");
          }
          break;
        }

        case "SymbolNode": {
          const symbol = node as SymbolNode;
          const isFunctionName =
            parent?.type === "FunctionNode" &&
            (parent as FunctionNode).fn === node;

          const allowed = isFunctionName
            ? FUNCTIONS.has(symbol.name)
            : ["x", "pi", "e"].includes(symbol.name);

          if (!allowed) {
            throw new Error(`Unsupported symbol: ${symbol.name}`);
          }
          break;
        }

        case "OperatorNode": {
          const operator = node as OperatorNode;
          if (!OPERATORS.has(operator.fn)) {
            throw new Error("Use only +, -, *, / and ^.");
          }
          if (operator.implicit) {
            throw new Error("Write multiplication explicitly, for example 2*x.");
          }
          break;
        }

        case "FunctionNode": {
          const fn = node as FunctionNode;
          if (
            fn.fn.type !== "SymbolNode" ||
            !FUNCTIONS.has((fn.fn as SymbolNode).name) ||
            fn.args.length !== 1
          ) {
            throw new Error("Use sin, cos, exp, log or sqrt with one argument.");
          }
          break;
        }

        case "ParenthesisNode":
          break;

        default:
          throw new Error("This expression format is not supported.");
      }
    });

    this.compiled = tree.compile();
  }

  getExpression(): string {
    return this.expression;
  }

  evaluate(x: number): number {
    if (!Number.isFinite(x)) {
      throw new Error("x must be a finite number.");
    }

    let value: unknown;
    try {
      value = this.compiled.evaluate({ x });
    } catch {
      throw new Error(`Cannot evaluate the expression at x = ${x}.`);
    }

    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`The expression must produce a finite real number at x = ${x}.`);
    }

    return value;
  }
}