// js/calculator.js
import { qs, qsa, formatMoney } from "./utils.js";

let display = "0";
let stored = null;
let pendingOp = null;
let justEvaluated = false;

function render() {
  const el = qs("#calc-display");
  if (el) el.textContent = display;
}

function inputDigit(d) {
  if (justEvaluated) {
    display = d;
    justEvaluated = false;
  } else {
    display = display === "0" ? d : display + d;
  }
  render();
}

function inputDecimal() {
  if (justEvaluated) {
    display = "0.";
    justEvaluated = false;
    return render();
  }
  if (!display.includes(".")) display += ".";
  render();
}

function clearAll() {
  display = "0";
  stored = null;
  pendingOp = null;
  justEvaluated = false;
  render();
}

function applyOp(a, b, op) {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return b === 0 ? NaN : a / b;
    default:
      return b;
  }
}

function chooseOp(op) {
  const value = parseFloat(display);
  if (stored !== null && pendingOp && !justEvaluated) {
    stored = applyOp(stored, value, pendingOp);
    display = String(Math.round(stored * 100) / 100);
  } else {
    stored = value;
  }
  pendingOp = op;
  justEvaluated = false;
  render();
}

function equals() {
  if (pendingOp === null || stored === null) return;
  const value = parseFloat(display);
  const result = applyOp(stored, value, pendingOp);
  display = Number.isNaN(result) ? "Error" : String(Math.round(result * 100) / 100);
  stored = null;
  pendingOp = null;
  justEvaluated = true;
  render();
}

function percent() {
  const value = parseFloat(display) / 100;
  display = String(value);
  render();
}

export function initCalculator() {
  const panel = qs("#calculator-panel");
  if (!panel || panel.dataset.bound) return;
  panel.dataset.bound = "true";

  panel.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-calc]");
    if (!btn) return;
    const action = btn.dataset.calc;
    if (/^[0-9]$/.test(action)) inputDigit(action);
    else if (action === ".") inputDecimal();
    else if (action === "C") clearAll();
    else if (action === "%") percent();
    else if (["+", "-", "*", "/"].includes(action)) chooseOp(action);
    else if (action === "=") equals();
  });

  qs("#calc-mortgage-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const principal = parseFloat(qs("#calc-mortgage-principal").value) || 0;
    const rounds = parseInt(qs("#calc-mortgage-rounds").value, 10) || 0;
    const rate = rounds * 10;
    const interest = principal * (rate / 100);
    const payoff = principal + interest;
    qs("#calc-mortgage-result").textContent =
      `${rate}% interest (${formatMoney(interest)}) — payoff: ${formatMoney(payoff)}`;
  });

  render();
}
export function toggleCalculator() {
  qs("#calculator-panel")?.classList.toggle("open");
}
