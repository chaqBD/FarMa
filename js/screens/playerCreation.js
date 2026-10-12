import { el, formatNaira, toast, icon, avatarSrc } from "../ui.js";
import { BACKGROUNDS } from "../data.js";
import { newGameState, saveGame } from "../state.js";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT (Abuja)", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara",
];

export function playerCreationScreen(onComplete) {
  let selectedBackgroundId = BACKGROUNDS[0]?.id ?? null;

  const nameInput = el("input", { type: "text", placeholder: "e.g. Bisi Adewale", maxlength: "40" });
  const farmNameInput = el("input", { type: "text", placeholder: "e.g. Golden Harvest Agro Ventures", maxlength: "40" });

  const avatarPreview = el("img", {
    class: "avatar-preview",
    src: avatarSrc("Woman"),
    alt: "Your farmer avatar",
    width: "96",
    height: "96",
  });

  const genderSelect = el("select", {
    onChange: () => { avatarPreview.src = avatarSrc(genderSelect.value); },
  }, [
    el("option", { value: "Woman" }, ["Woman"]),
    el("option", { value: "Man" }, ["Man"]),
  ]);

  const stateSelect = el(
    "select",
    {},
    NIGERIAN_STATES.map((s) => el("option", { value: s }, [s]))
  );
  stateSelect.value = "Lagos";

  const backgroundGrid = el("div", { class: "background-grid" });

  function renderBackgrounds() {
    backgroundGrid.innerHTML = "";
    for (const bg of BACKGROUNDS) {
      const selected = bg.id === selectedBackgroundId;
      const card = el(
        "button",
        {
          type: "button",
          class: "background-card" + (selected ? " selected" : ""),
          onClick: () => {
            selectedBackgroundId = bg.id;
            renderBackgrounds();
          },
        },
        [
          el("div", { class: "card-title-row" }, [icon("logo", 28), el("h3", {}, [bg.label])]),
          el("p", { class: "cash" }, [formatNaira(bg.startingCash)]),
          el("p", { class: "perk" }, ["✓ " + bg.perk]),
          el("p", { class: "drawback" }, ["✗ " + bg.drawback]),
        ]
      );
      backgroundGrid.appendChild(card);
    }
  }
  renderBackgrounds();

  function submit() {
    const name = nameInput.value.trim();
    const farmName = farmNameInput.value.trim();
    if (!name) return toast("Enter your name, oga/madam.");
    if (!farmName) return toast("Your farm needs a name too.");
    if (!selectedBackgroundId) return toast("Pick a background to start.");

    const state = newGameState({
      name,
      gender: genderSelect.value,
      homeState: stateSelect.value,
      farmName,
      backgroundId: selectedBackgroundId,
    });
    saveGame(state);
    onComplete(state);
  }

  const hero = el("header", { class: "hero" }, [
    el("div", { class: "hero-sky" }, [
      el("div", { class: "hero-sun" }),
      el("div", { class: "hero-hill hero-hill-back" }),
      el("div", { class: "hero-hill hero-hill-front" }),
      el("div", { class: "hero-crop hero-crop-1" }, [icon("maize", 40)]),
      el("div", { class: "hero-crop hero-crop-2" }, [icon("cassava", 36)]),
      el("div", { class: "hero-crop hero-crop-3" }, [icon("tomato", 32)]),
    ]),
    el("div", { class: "hero-title-row" }, [icon("logo", 48), el("h1", {}, ["FaRma"])]),
    el("p", { class: "tagline" }, ["From one plot to the whole market — can you feed Lagos and still make profit?"]),
  ]);

  return el("div", { class: "screen player-creation" }, [
    hero,
    el("section", { class: "avatar-row" }, [
      avatarPreview,
      el("div", { class: "form-row avatar-fields" }, [
        el("label", {}, ["Your name", nameInput]),
        el("label", {}, ["Gender", genderSelect]),
      ]),
    ]),
    el("section", { class: "form-row" }, [
      el("label", {}, ["Home state", stateSelect]),
      el("label", {}, ["Farm name", farmNameInput]),
    ]),
    el("h2", {}, ["Choose your background"]),
    backgroundGrid,
    el("button", { class: "primary-btn", type: "button", onClick: submit }, ["Start Farming"]),
  ]);
}
