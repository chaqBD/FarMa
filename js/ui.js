import { iconHtml } from "./icons.js";

/** Tiny DOM helper: el("div", {class: "card"}, ["text", el("span", {}, ["x"])]) */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === "html") {
      node.innerHTML = value;
    } else if (value !== null && value !== undefined) {
      node.setAttribute(key, value);
    }
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

/** A small inline-SVG icon badge; see js/icons.js for the available names. */
export function icon(name, size = 28) {
  return el("span", { class: "icon", style: `width:${size}px;height:${size}px`, html: iconHtml(name) });
}

export function formatNaira(amount) {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "-" : "";
  return sign + "₦" + Math.abs(rounded).toLocaleString("en-NG");
}

const app = () => document.getElementById("app");

export function render(screen) {
  const root = app();
  root.innerHTML = "";
  root.appendChild(screen);
}

export function toast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const node = el("div", { class: "toast" }, [message]);
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 2200);
}

/**
 * Shows a blocking modal for a random event with its choice buttons.
 * onChoice(index) is called once, then the modal removes itself.
 */
export function showEventModal(event, onChoice) {
  const overlay = el("div", { class: "modal-overlay" });
  const choose = (index) => {
    overlay.remove();
    onChoice(index);
  };
  const card = el("div", { class: "modal-card" }, [
    el("p", { class: "modal-category" }, [event.category]),
    el("h2", {}, [event.title]),
    el("p", {}, [event.body]),
    el(
      "div",
      { class: "modal-choices" },
      event.choices.map((choice, index) =>
        el(
          "button",
          { class: "primary-btn", type: "button", onClick: () => choose(index) },
          [choice.label]
        )
      )
    ),
  ]);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}
