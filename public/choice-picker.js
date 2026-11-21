import { display } from "./locale.js";

export function installChoicePicker(select, trigger, title, choose) {
  if (typeof HTMLDialogElement === "undefined" || !HTMLDialogElement.prototype.showModal) return false;
  select.classList.add("picker-select");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");
  trigger.tabIndex = 0;
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.addEventListener("click", () => {
    if (!select.disabled && !document.querySelector(".choice-picker:modal")) {
      openPicker(select, trigger, title(), choose);
    }
  });
  return true;
}

function openPicker(select, trigger, title, choose) {
  const dialog = document.createElement("dialog");
  dialog.className = "choice-picker";
  dialog.dataset.verbatim = "";
  dialog.setAttribute("aria-labelledby", "choice-picker-title");
  dialog.setAttribute("aria-modal", "true");
  dialog.innerHTML = `
    <h2 id="choice-picker-title" tabindex="-1" autofocus></h2>
    <div class="picker-options" role="listbox" aria-labelledby="choice-picker-title"></div>
    <p class="picker-error" role="alert" hidden></p>
    <div class="picker-actions"><button type="button" class="outline-btn" tabindex="0"></button></div>`;
  const heading = dialog.querySelector("h2");
  const list = dialog.querySelector(".picker-options");
  const error = dialog.querySelector(".picker-error");
  const cancel = dialog.querySelector(".picker-actions button");
  const lifetime = new AbortController();
  heading.textContent = title;
  cancel.textContent = display("Cancel");

  function close() {
    lifetime.abort();
    dialog.close();
  }

  const choices = Array.from(select.options, option => {
    const button = document.createElement("button");
    button.type = "button";
    button.value = option.value;
    button.textContent = option.label;
    if (option.lang) button.lang = option.lang;
    button.disabled = option.matches(":disabled");
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(option.selected));
    button.tabIndex = -1;
    return button;
  });
  list.append(...choices);
  const available = choices.filter(button => !button.disabled);
  let current = available.find(button => button.getAttribute("aria-selected") === "true") || available[0];
  if (current) current.tabIndex = 0;

  function reveal(button) {
    const top = button.offsetTop;
    const bottom = top + button.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }

  let applying = false;
  list.addEventListener("click", async event => {
    const option = event.target.closest('button[role="option"]');
    if (!option || option.disabled || applying) return;
    if (option.value === select.value) return close();
    error.hidden = true;
    if (!choose) {
      select.value = option.value;
      select.dispatchEvent(new Event("input", {bubbles:true}));
      select.dispatchEvent(new Event("change", {bubbles:true}));
      close();
      return;
    }
    applying = true;
    try {
      await choose(option.value, lifetime.signal);
      if (dialog.open) close();
    } catch (failure) {
      if (dialog.open) {
        error.textContent = failure.message;
        error.hidden = false;
      }
    } finally {
      applying = false;
    }
  });

  let typed = "", lastKey = 0;
  const normalized = text => text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase(document.documentElement.lang);
  dialog.addEventListener("keydown", event => {
    if (!current || event.target === cancel || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = available.indexOf(current);
    let next;
    switch (event.key) {
      case "ArrowDown": next = event.target === heading ? current : available[Math.min(index + 1, available.length - 1)]; break;
      case "ArrowUp": next = event.target === heading ? current : available[Math.max(index - 1, 0)]; break;
      case "Home": next = available[0]; break;
      case "End": next = available.at(-1); break;
      default: {
        if (event.key.length !== 1 || event.key === " ") return;
        const now = performance.now();
        typed = (now - lastKey < 650 ? typed : "") + normalized(event.key);
        lastKey = now;
        next = available.find(button => normalized(button.textContent).startsWith(typed));
      }
    }
    if (!next) return;
    event.preventDefault();
    current.tabIndex = -1;
    current = next;
    current.tabIndex = 0;
    current.focus({preventScroll:true});
    reveal(current);
  });

  cancel.addEventListener("click", close);
  dialog.addEventListener("cancel", () => lifetime.abort());
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom) close();
  });
  dialog.addEventListener("close", () => dialog.remove(), {once:true});
  document.body.append(dialog);
  trigger.focus({preventScroll:true});
  dialog.showModal();
  if (current) reveal(current);
}
