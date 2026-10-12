import { el, toast } from "../ui.js";

export const NAV_ITEMS = [
  { id: "home", label: "Home", enabled: true },
  { id: "land", label: "My Land", enabled: true },
  { id: "shop", label: "Shop", enabled: false },
  { id: "workers", label: "Workers", enabled: true },
  { id: "livestock", label: "Livestock", enabled: false },
  { id: "market", label: "Market", enabled: true },
  { id: "bank", label: "Bank", enabled: true },
  { id: "life", label: "Life", enabled: false },
];

export function navBar(activeId, navigate) {
  return el(
    "nav",
    { class: "nav-bar" },
    NAV_ITEMS.map((item) =>
      el(
        "button",
        {
          type: "button",
          class: "nav-btn" + (item.enabled ? "" : " disabled") + (item.id === activeId ? " active" : ""),
          title: item.enabled ? "" : "Coming soon",
          onClick: () => {
            if (!item.enabled) return toast(`${item.label}: coming soon`);
            if (item.id !== activeId) navigate(item.id);
          },
        },
        [item.label]
      )
    )
  );
}
