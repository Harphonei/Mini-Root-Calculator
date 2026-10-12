import "./style.css";
import { Equation } from "./domain/Equation";
import { SolverConfig } from "./domain/SolverConfig";
import { BisectionSolver } from "./domain/BisectionSolver";
import { FalsePositionSolver } from "./domain/FalsePositionSolver";
import type { RootSolver } from "./domain/RootSolver";
import { auth, db } from "./data/firebase";
import { HistoryRepository } from "./data/HistoryRepository";
import { HistoryPanel } from "./ui/HistoryPanel";
import type { CurrentCalculation } from "./ui/HistoryPanel";

let currentCalculation: CurrentCalculation | null = null;

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App container not found.");

app.innerHTML = `
  <main class="calculator">
    <header>
      <span class="badge">✦ MINI MATH WORLD ✦</span>
      <h1>Mini Root Calculator</h1>
      <p>A little magic for your equations ♡</p>
    </header>

    <section class="panel">
      <h2>♡ Your equation</h2>

      <form id="calculator-form">
        <label for="method">Method</label>
        <select id="method">
          <option value="bisection">Bisection</option>
          <option value="false-position">False Position</option>
        </select>

        <label for="expression">Expression f(x)</label>
        <input id="expression" value="x^2 - 2"
          maxlength="200" required spellcheck="false">
        <p class="hint">
          Solve f(x) = 0. Use x, + - * / ^ and parentheses.
          Functions: sin, cos, exp, log, sqrt.
          Angles are in radians; log means natural logarithm.
          Choose an interval where f(x) is continuous.
        </p>

        <div class="examples">
          <button type="button" data-example="0">x² − 2</button>
          <button type="button" data-example="1">x³ − 4x − 9</button>
          <button type="button" data-example="2">cos(x) − x</button>
        </div>

        <div class="field-grid">
          <div>
            <label for="lower">Lower bound</label>
            <input id="lower" type="number" step="any"
              value="1" required>
          </div>
          <div>
            <label for="upper">Upper bound</label>
            <input id="upper" type="number" step="any"
              value="2" required>
          </div>
          <div>
            <label for="tolerance">Function tolerance |f(x)|</label>
            <input id="tolerance" type="number" step="any"
              value="0.000001" required>
          </div>
          <div>
            <label for="max-iterations">Max iterations</label>
            <input id="max-iterations" type="number"
              min="1" max="500" step="1" value="100" required>
          </div>
        </div>

        <button class="calculate" type="submit">Calculate ✦</button>
      </form>
    </section>

    <section id="result" class="panel" aria-live="polite" hidden>
      <h2>✦ Your result</h2>
      <p id="result-message"></p>
      <div id="result-summary" class="summary"></div>
      <div class="table-wrap">
        <table>
          <caption>Iteration table</caption>
          <thead>
            <tr>
              <th>Iteration</th>
              <th>Lower</th>
              <th>Upper</th>
              <th>Estimate</th>
              <th>f(Estimate)</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody id="iteration-rows"></tbody>
        </table>
      </div>
    </section>

    <footer>Made with numbers & a little pixel magic ♡</footer>
  </main>
`;

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element: ${id}`);
  return found as T;
}

function input(id: string): HTMLInputElement {
  return element<HTMLInputElement>(id);
}

function format(value: number): string {
  return value === 0 ? "0" : Number(value.toPrecision(10)).toString();
}

const examples = [
  { expression: "x^2 - 2", lower: "1", upper: "2" },
  { expression: "x^3 - 4*x - 9", lower: "2", upper: "3" },
  { expression: "cos(x) - x", lower: "0", upper: "1" }
];

document.querySelectorAll<HTMLButtonElement>("[data-example]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      const example = examples[Number(button.dataset.example)];
      if (!example) return;
      input("expression").value = example.expression;
      input("lower").value = example.lower;
      input("upper").value = example.upper;
      element("result").hidden = true;
      currentCalculation = null;
    });
  });

element<HTMLFormElement>("calculator-form")
  .addEventListener("submit", (event) => {
    event.preventDefault();
    currentCalculation = null;

    const resultPanel = element("result");
    const message = element("result-message");
    const summary = element("result-summary");
    const tableBody = element("iteration-rows");

    resultPanel.hidden = false;
    summary.replaceChildren();
    tableBody.replaceChildren();
    resultPanel.classList.remove("error");

    try {
      const equation = new Equation(input("expression").value);
      const config = new SolverConfig(
        input("lower").valueAsNumber,
        input("upper").valueAsNumber,
        input("tolerance").valueAsNumber,
        input("max-iterations").valueAsNumber
      );

      const method = element<HTMLSelectElement>("method").value;
      const solver: RootSolver = method === "bisection"
        ? new BisectionSolver(equation, config)
        : new FalsePositionSolver(equation, config);

      const result = solver.solve();
      currentCalculation = { result, config };

      const statusLabels = {
        converged: "Tolerance reached",
        max_iterations: "Iteration limit reached",
        stagnated: "Calculation stagnated"
      };

      message.textContent = result.message;

      const cards = [
        ["Root estimate", format(result.root)],
        ["f(Root estimate)", format(result.functionValue)],
        ["Iterations", String(result.iterations)],
        ["Status", statusLabels[result.status]]
      ];

      for (const [label, value] of cards) {
        const card = document.createElement("div");
        card.className = "result-card";
        const title = document.createElement("span");
        title.textContent = label ?? "";
        const content = document.createElement("strong");
        content.textContent = value ?? "";
        card.append(title, content);
        summary.appendChild(card);
      }

      for (const row of result.rows) {
        const tr = document.createElement("tr");
        const values = [
          String(row.iteration),
          format(row.lower),
          format(row.upper),
          format(row.estimate),
          format(row.functionValue),
          row.change === null ? "—" : format(row.change)
        ];

        for (const value of values) {
          const td = document.createElement("td");
          td.textContent = value;
          tr.appendChild(td);
        }
        tableBody.appendChild(tr);
      }

      if (result.rows.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 6;
        td.textContent = "Root found at an endpoint. No iterations needed.";
        tr.appendChild(td);
        tableBody.appendChild(tr);
      }
    } catch (error) {
      resultPanel.classList.add("error");
      message.textContent = error instanceof Error
        ? error.message
        : "Calculation failed.";
    }
  });
  const calculator = document.querySelector<HTMLElement>(".calculator");
  if (!calculator) throw new Error("Calculator container not found.");

  const historyRepository = new HistoryRepository(auth, db);

  const historyPanel = new HistoryPanel(
     historyRepository,
     () => currentCalculation
);

historyPanel.mount(calculator);