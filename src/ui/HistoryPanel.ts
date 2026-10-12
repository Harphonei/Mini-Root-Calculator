import type { HistoryEntry } from "../data/HistoryRepository";
import { HistoryRepository } from "../data/HistoryRepository";
import type { SolverConfig } from "../domain/SolverConfig";
import type { SolverResult } from "../domain/SolverResult";

export interface CurrentCalculation {
  result: SolverResult;
  config: SolverConfig;
}

export class HistoryPanel {
  private readonly repository: HistoryRepository;
  private readonly getCurrent: () => CurrentCalculation | null;
  private readonly panel: HTMLElement;
  private readonly message: HTMLParagraphElement;
  private readonly list: HTMLDivElement;
  private readonly details: HTMLDivElement;
  private readonly saveButton: HTMLButtonElement;
  private readonly refreshButton: HTMLButtonElement;
  private readonly saved = new WeakSet<SolverResult>();

  constructor(
    repository: HistoryRepository,
    getCurrent: () => CurrentCalculation | null
  ) {
    this.repository = repository;
    this.getCurrent = getCurrent;

    this.panel = document.createElement("section");
    this.panel.className = "panel";
    this.panel.innerHTML = `
      <h2>♡ Calculation history</h2>
      <div class="examples">
        <button type="button" data-save>Save current result ♡</button>
        <button type="button" data-refresh>Refresh history</button>
      </div>
      <p class="hint">
        Your latest 20 saved calculations.
        History belongs to this browser's anonymous account.
        Clearing browser data may remove access to it.
      </p>
      <p data-message role="status"></p>
      <div data-list class="history-list"></div>
      <div data-details></div>
    `;

    this.message = this.find<HTMLParagraphElement>("[data-message]");
    this.list = this.find<HTMLDivElement>("[data-list]");
    this.details = this.find<HTMLDivElement>("[data-details]");
    this.saveButton = this.find<HTMLButtonElement>("[data-save]");
    this.refreshButton = this.find<HTMLButtonElement>("[data-refresh]");

    this.saveButton.addEventListener("click", () => {
      void this.saveCurrent();
    });

    this.refreshButton.addEventListener("click", () => {
      void this.refresh();
    });
  }

  mount(container: HTMLElement): void {
    const footer = container.querySelector("footer");
    container.insertBefore(this.panel, footer);
    void this.refresh();
  }

  private find<T extends HTMLElement>(selector: string): T {
    const found = this.panel.querySelector<T>(selector);
    if (!found) throw new Error(`Missing history element: ${selector}`);
    return found;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private async saveCurrent(): Promise<void> {
    const current = this.getCurrent();

    if (!current) {
      this.message.textContent = "Calculate a result first.";
      return;
    }

    if (this.saved.has(current.result)) {
      this.message.textContent = "This result is already saved.";
      return;
    }

    this.saveButton.disabled = true;
    this.message.textContent = "Saving...";

    try {
      await this.repository.save(current.result, current.config);
      this.saved.add(current.result);
    } catch (error) {
      this.message.textContent =
        `Could not save. Try again. ${this.errorMessage(error)}`;
      this.saveButton.disabled = false;
      return;
    }

    await this.refresh("Saved successfully ♡");
    this.saveButton.disabled = false;
  }

  private async refresh(successMessage = "History loaded."): Promise<void> {
    this.refreshButton.disabled = true;

    try {
      const entries = await this.repository.getLatest();
      this.list.replaceChildren();

      if (entries.length === 0) {
        this.list.textContent = "No saved calculations yet.";
      }

      for (const entry of entries) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "history-item";

        const date = entry.createdAt
          ? entry.createdAt.toDate().toLocaleString()
          : "Time unavailable";

        button.textContent =
          `${entry.expression} · ${entry.method} · ${date}`;

        button.addEventListener("click", () => this.showDetails(entry));
        this.list.appendChild(button);
      }

      this.message.textContent = successMessage;
    } catch (error) {
      this.message.textContent =
        `${successMessage === "Saved successfully ♡"
          ? "Saved, but could not reload history."
          : "Could not load history."} ${this.errorMessage(error)}`;
    } finally {
      this.refreshButton.disabled = false;
    }
  }

  private showDetails(entry: HistoryEntry): void {
    this.details.replaceChildren();

    const heading = document.createElement("h3");
    heading.textContent = `${entry.method}: ${entry.expression}`;

    const summary = document.createElement("p");
    summary.className = "history-summary";
    summary.textContent =
      `Initial interval: [${entry.lower}, ${entry.upper}]\n` +
      `Tolerance: ${entry.tolerance} · Max iterations: ${entry.maxIterations}\n` +
      `Root estimate: ${entry.root} · f(x): ${entry.functionValue}\n` +
      `Status: ${entry.status} · Iterations: ${entry.iterations}\n` +
      entry.message;

    const wrapper = document.createElement("div");
    wrapper.className = "table-wrap";

    const table = document.createElement("table");
    const caption = table.createCaption();
    caption.textContent = "Saved iteration table";

    const header = table.createTHead().insertRow();
    for (const label of [
      "Iteration", "Lower", "Upper", "Estimate", "f(Estimate)", "Change"
    ]) {
      const th = document.createElement("th");
      th.textContent = label;
      header.appendChild(th);
    }

    const body = table.createTBody();
    for (const row of entry.rows) {
      const tr = body.insertRow();
      for (const value of [
        row.iteration, row.lower, row.upper,
        row.estimate, row.functionValue, row.change
      ]) {
        tr.insertCell().textContent = value === null
          ? "—"
          : String(value);
      }
    }

    if (entry.rows.length === 0) {
      const cell = body.insertRow().insertCell();
      cell.colSpan = 6;
      cell.textContent = "Endpoint root: no iterations needed.";
    }

    wrapper.appendChild(table);
    this.details.append(heading, summary, wrapper);
  }
}