import { Equation } from "../domain/Equation";
import type { SolverConfig } from "../domain/SolverConfig";
import type { SolverResult } from "../domain/SolverResult";

const NS = "http://www.w3.org/2000/svg";

export class RootGraph {
  private readonly host: HTMLElement;
  private result: SolverResult | null = null;
  private equation: Equation | null = null;
  private lower = 0;
  private upper = 1;
  private index = 0;

  constructor(host: HTMLElement) { this.host = host; }

  clear(): void {
    this.result = null;
    this.equation = null;
    this.host.replaceChildren();
  }

  show(result: SolverResult, config: SolverConfig): void {
    this.result = result;
    this.lower = config.getLower();
    this.upper = config.getUpper();
    this.index = 0;
    try {
      this.equation = new Equation(result.expression);
      this.draw();
    } catch {
      this.host.textContent = "Graph unavailable. Calculation results remain above.";
    }
  }

  private svgElement(tag: string, attributes: Record<string, string>) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attributes)) {
      node.setAttribute(key, value);
    }
    return node;
  }

  private draw(): void {
    const result = this.result;
    const equation = this.equation;
    if (!result || !equation) return;
    this.host.replaceChildren();
    const title = document.createElement("h3");
    title.textContent = "✦ Root explorer";
    this.host.append(title);
    const span = this.upper - this.lower;
    if (!Number.isFinite(span) || span <= 0) {
      const note = document.createElement("p");
      note.textContent = "This interval is too large to plot.";
      this.host.append(note);
      return;
    }

    const samples: Array<{ x: number; y: number | null }> = [];
    for (let i = 0; i <= 400; i++) {
      const x = this.lower + span * (i / 400);
      let y: number | null = null;
      try { y = equation.evaluate(x); } catch { /* Leave a gap. */ }
      samples.push({ x, y });
    }
    const row = result.rows[this.index];
    const a = row?.lower ?? this.lower;
    const b = row?.upper ?? this.upper;
    const estimate = row?.estimate ?? result.root;
    const fa = equation.evaluate(a);
    const fb = equation.evaluate(b);
    const fe = row?.functionValue ?? result.functionValue;
    const scale = Math.max(1e-12, Math.abs(fa), Math.abs(fb), Math.abs(fe),
      ...samples.map(p => p.y === null ? 0 : Math.abs(p.y)));
    const px = (x: number) => 64 + ((x - this.lower) / span) * 620;
    const py = (y: number) => 175 - (y / scale) * 125;
    const svg = this.svgElement("svg", {
      viewBox: "0 0 740 340", role: "img",
      "aria-label": "Function curve and selected root-finding iteration"
    });
    const line = (x1: number, y1: number, x2: number, y2: number,
      color: string, dashed = false) => {
      svg.append(this.svgElement("line", {
        x1: String(x1), y1: String(y1), x2: String(x2), y2: String(y2),
        stroke: color, "stroke-width": "2",
        "stroke-dasharray": dashed ? "6 5" : "none"
      }));
    };
    const text = (x: number, y: number, label: string, color = "#654581") => {
      const node = this.svgElement("text", {
        x: String(x), y: String(y), fill: color,
        "font-size": "12", "font-family": "monospace"
      });
      node.textContent = label;
      svg.append(node);
    };
    svg.append(this.svgElement("rect", {
      x: String(px(a)), y: "35", width: String(Math.max(0, px(b) - px(a))),
      height: "280", fill: "#f3d9ed", opacity: "0.6"
    }));
    for (const fraction of [-1, -0.5, 0, 0.5, 1]) {
      const y = fraction * scale;
      line(64, py(y), 684, py(y), "#e4d6ef");
      text(3, py(y) + 4, y.toExponential(1));
    }
    line(64, 175, 684, 175, "#654581");
    for (let i = 0; i <= 4; i++) {
      const x = this.lower + span * i / 4;
      line(px(x), 35, px(x), 305, "#e4d6ef");
      text(px(x) - 15, 328, Number(x.toPrecision(4)).toString());
    }
    if (this.lower <= 0 && this.upper >= 0) {
      line(px(0), 35, px(0), 305, "#654581");
    }
    let path = "";
    let previous: number | null = null;
    for (const point of samples) {
      if (point.y === null) { previous = null; continue; }
      const split = previous === null ||
        Math.abs(point.y / scale - previous / scale) > 0.8;
      path += (split ? "M" : "L") + px(point.x) + "," + py(point.y) + " ";
      previous = point.y;
    }
    svg.append(this.svgElement("path", {
      d: path, fill: "none", stroke: "#8653b7", "stroke-width": "3"
    }));
    if (row && result.method === "False Position") {
      line(px(a), py(fa), px(b), py(fb), "#d27b32", true);
    }
    for (const [x, y, color] of [
      [a, fa, "#438ca0"], [b, fb, "#438ca0"],
      [estimate, fe, "#ca3d8c"]
    ] as const) {
      line(px(x), 35, px(x), 305, color, true);
      svg.append(this.svgElement("circle", {
        cx: String(px(x)), cy: String(py(y)), r: "5", fill: color
      }));
    }
    svg.append(this.svgElement("rect", {
      x: String(px(estimate) - 4), y: "171",
      width: "8", height: "8", fill: "#ca3d8c"
    }));
    this.host.append(svg);
    const info = document.createElement("p");
    info.className = "hint";
    info.textContent = row
      ? "Iteration " + row.iteration + " / " + result.rows.length +
        " · Lower: " + a.toPrecision(7) + " · Upper: " + b.toPrecision(7) +
        " · Estimate: " + estimate.toPrecision(7)
      : "Endpoint root: no iterations needed.";
    this.host.append(info);
    const legend = document.createElement("p");
    legend.className = "hint";
    legend.textContent = "Purple: f(x) · Blue: interval bounds · Pink: estimate" +
      (result.method === "False Position" ? " · Orange: secant line" : "") +
      ". The shaded area is the current interval. Sampled graph; gaps and sharp jumps are omitted. This does not prove continuity.";
    this.host.append(legend);
    if (!row) return;

    const controls = document.createElement("div");
    controls.className = "graph-controls";
    const previousButton = document.createElement("button");
    previousButton.type = "button";
    previousButton.textContent = "← Previous";
    previousButton.disabled = this.index === 0;
    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.textContent = "Next →";
    nextButton.disabled = this.index === result.rows.length - 1;
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = String(result.rows.length - 1);
    slider.value = String(this.index);
    slider.setAttribute("aria-label", "Select iteration");
    const update = (index: number) => {
      this.index = index;
      this.draw();
      this.host.querySelector<HTMLInputElement>('input[type="range"]')?.focus();
    };
    previousButton.addEventListener("click", () => update(this.index - 1));
    nextButton.addEventListener("click", () => update(this.index + 1));
    slider.addEventListener("change", () => update(Number(slider.value)));
    controls.append(previousButton, slider, nextButton);
    this.host.append(controls);
  }
}

