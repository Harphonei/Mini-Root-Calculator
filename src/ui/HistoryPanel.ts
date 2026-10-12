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
  private readonly saved = new Map<SolverResult, string>();
  private busy = false;

  constructor(repository: HistoryRepository,
    getCurrent: () => CurrentCalculation | null) {
    this.repository = repository;
    this.getCurrent = getCurrent;
    this.panel = document.createElement("section");
    this.panel.className = "panel";
    this.panel.innerHTML = `
      <h2>♡ Calculation history</h2>
      <div class="examples">
        <button type="button" data-save>Save current result ♡</button>
        <button type="button" data-refresh>Refresh history</button>
        <button type="button" data-clear class="danger-button">Clear all history</button>
      </div>
      <p class="hint">Your latest 20 saved calculations.
        Clear all deletes ALL your saved history, including older records.
        Deletion is permanent.
        History belongs to this browser's anonymous account.
        Clearing browser data may remove access to it.</p>
      <p data-message role="status"></p>
      <div data-list class="history-list"></div>
      <div data-details></div>
    `;
    this.message = this.find("[data-message]");
    this.list = this.find("[data-list]");
    this.details = this.find("[data-details]");
    this.find("[data-save]").addEventListener("click", () => void this.saveCurrent());
    this.find("[data-refresh]").addEventListener("click", () => void this.refresh());
    this.find("[data-clear]").addEventListener("click", () => void this.clearAll());
  }

  mount(container: HTMLElement): void {
    container.insertBefore(this.panel, container.querySelector("footer"));
    void this.refresh();
  }

  private find<T extends HTMLElement>(selector: string): T {
    const found = this.panel.querySelector<T>(selector);
    if (!found) throw new Error("Missing history element: " + selector);
    return found;
  }

  private setBusy(busy: boolean): void {
    this.busy = busy;
    this.panel.setAttribute("aria-busy", String(busy));
    this.panel.querySelectorAll<HTMLButtonElement>("button")
      .forEach(button => { button.disabled = busy; });
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private async loadEntries(): Promise<void> {
    const entries = await this.repository.getLatest();
    this.list.replaceChildren();
    this.details.replaceChildren();
    if (entries.length === 0) this.list.textContent = "No saved calculations yet.";
    for (const entry of entries) {
      const row = document.createElement("div");
      row.className = "history-row";
      const open = document.createElement("button");
      open.type = "button";
      open.className = "history-item";
      const date = entry.createdAt
        ? entry.createdAt.toDate().toLocaleString() : "Time unavailable";
      open.textContent = entry.expression + " · " + entry.method + " · " + date;
      open.addEventListener("click", () => this.showDetails(entry));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "danger-button";
      remove.textContent = "Delete";
      remove.setAttribute("aria-label", "Delete " + entry.expression + " " + date);
      remove.addEventListener("click", () => void this.deleteOne(entry));
      row.append(open, remove);
      this.list.append(row);
    }
    this.setBusy(this.busy);
  }

  private async refresh(): Promise<void> {
    if (this.busy) return;
    this.setBusy(true);
    this.message.textContent = "Loading history...";
    try {
      await this.loadEntries();
      this.message.textContent = "History loaded.";
    } catch (error) {
      this.message.textContent = "Could not load history. " + this.errorMessage(error);
    } finally { this.setBusy(false); }
  }

  private async saveCurrent(): Promise<void> {
    if (this.busy) return;
    const current = this.getCurrent();
    if (!current) { this.message.textContent = "Calculate a result first."; return; }
    if (this.saved.has(current.result)) {
      this.message.textContent = "This result is already saved."; return;
    }
    this.setBusy(true);
    this.message.textContent = "Saving...";
    let committed = false;
    try {
      const id = await this.repository.save(current.result, current.config);
      this.saved.set(current.result, id);
      committed = true;
      await this.loadEntries();
      this.message.textContent = "Saved successfully ♡";
    } catch (error) {
      this.message.textContent = (committed
        ? "Saved, but could not reload history. "
        : "Could not save. Try again. ") + this.errorMessage(error);
    } finally { this.setBusy(false); }
  }

  private async deleteOne(entry: HistoryEntry): Promise<void> {
    if (this.busy) return;
    if (!window.confirm("Permanently delete this calculation?\n" +
      entry.expression + " · " + entry.method + "\nThis cannot be undone.")) return;
    this.setBusy(true);
    this.message.textContent = "Deleting...";
    let committed = false;
    try {
      await this.repository.deleteOne(entry.id);
      committed = true;
      for (const [result, id] of this.saved) {
        if (id === entry.id) this.saved.delete(result);
      }
      this.details.replaceChildren();
      await this.loadEntries();
      this.message.textContent = "Calculation deleted.";
    } catch (error) {
      this.message.textContent = (committed
        ? "Deleted, but could not reload history. "
        : "Could not delete. ") + this.errorMessage(error);
    } finally { this.setBusy(false); }
  }

  private async clearAll(): Promise<void> {
    if (this.busy) return;
    if (!window.confirm("Permanently delete ALL your calculation history?\n" +
      "This includes older records beyond the latest 20.\nThis cannot be undone.")) return;
    this.setBusy(true);
    this.message.textContent = "Clearing history...";
    let committed = false;
    try {
      const count = await this.repository.clearAll(deleted => {
        this.message.textContent = "Clearing history... deleted " + deleted + " records.";
      });
      committed = true;
      this.saved.clear();
      this.details.replaceChildren();
      await this.loadEntries();
      this.message.textContent = "History cleared. Deleted " + count + " records.";
    } catch (error) {
      this.saved.clear();
      this.details.replaceChildren();
      try { await this.loadEntries(); } catch { /* Keep the original error. */ }
      this.message.textContent = (committed
        ? "History cleared, but could not reload. "
        : "") + this.errorMessage(error);
    } finally { this.setBusy(false); }
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
