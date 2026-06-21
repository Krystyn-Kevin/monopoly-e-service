// js/modal.js
import { qs } from "./utils.js";

let submitHandler = null;

export function openModal({ title, bodyHtml, submitLabel = "Confirm", onSubmit }) {
  const overlay = qs("#modal-overlay");
  const titleEl = qs("#modal-title");
  const bodyEl = qs("#modal-body");
  const submitBtn = qs("#modal-submit");

  titleEl.textContent = title;
  bodyEl.innerHTML = bodyHtml;
  submitBtn.textContent = submitLabel;
  overlay.classList.add("open");

  submitHandler = onSubmit;
  setTimeout(() => bodyEl.querySelector("input,select,textarea")?.focus(), 30);
}

export function closeModal() {
  qs("#modal-overlay")?.classList.remove("open");
  submitHandler = null;
}

export function initModal() {
  qs("#modal-close")?.addEventListener("click", closeModal);
  qs("#modal-overlay")?.addEventListener("click", (e) => {
    if (e.target.id === "modal-overlay") closeModal();
  });
  qs("#modal-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submitHandler) {
      const formData = new FormData(e.target);
      await submitHandler(formData, e.target);
    }
  });
}
