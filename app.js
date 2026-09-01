const STORAGE_KEY = "quest-english-trial-state-v2";

const blankState = () => ({
  step: 0,
  name: "",
  age: "",
  feel: "",
  color: "",
  pet: "",
  hobbies: [],
  choices: {},
  goal: "",
  markers: [],
  notes: "",
  scene: "",
  sceneLocation: "",
  imagine: "",
  photo: "",
});

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return saved ? { ...blankState(), ...saved, choices: saved.choices || {} } : blankState();
  } catch {
    return blankState();
  }
}

let state = loadState();
let generatedImage = "";
let isGenerating = false;

const steps = [
  {
    mins: 4,
    tag: "01 / WARM-UP / 4 MIN",
    title: "Meet your new teammate",
    note: "Цель: снять барьер и услышать первые фразы. Сначала поддержи, затем мягко перефразируй.",
    html: `
      <div class="coach-box"><b>Teacher move</b><span>Улыбнись, представься и дай модель: “I’m Alex. I’m 28.”</span></div>
      <div class="prompt">“Hi! What is your name? How old are you?”</div>
      <div class="answer-row"><input class="answer-input" id="nameInput" aria-label="Имя ученика" placeholder="My name is…" /><input class="answer-input" id="ageInput" aria-label="Возраст ученика" type="number" min="3" max="18" placeholder="I’m … years old" /></div>
      <div class="deep-dive"><b>Углубление</b> “Where are you from?” / “What class are you in?” / “Can you spell your name?”</div>
      <div class="prompt">“How are you feeling today?”</div>
      <div class="emoji-grid">${[["😊", "Happy"], ["😴", "Tired"], ["🤩", "Excited"], ["🙈", "Shy"]].map(([emoji, label]) => `<button class="emoji" type="button" data-feel="${label}" aria-label="${label}">${emoji}<small>${label}</small></button>`).join("")}</div>
      <div class="teacher-check"><span>Отметь услышанное</span>${["to be", "numbers", "full sentence"].map((marker) => `<button class="check" type="button" data-marker="${marker}">＋ ${marker}</button>`).join("")}</div>`,
  },
  {
    mins: 4,
    tag: "02 / FEELINGS / 4 MIN",
    title: "Read the mood",
    note: "Цель: расширить ответы и проверить понимание вопроса “How are you?”. Прими жесты и однословные ответы.",
    html: `
      <div class="prompt">“Why are you feeling this way?”</div>
      <div class="answer-row">${["Because I’m happy", "Because I’m tired", "Because I had a good day"].map((answer) => `<button class="option feeling-option" type="button" data-feelphrase="${answer}">${answer}</button>`).join("")}</div>
      <div class="deep-dive"><b>Если легко</b> “What makes you happy?” / “How do you feel on Mondays?”</div>
      <div class="prompt">One complete sentence</div>
      <div class="sentence-card"><div class="sentence-task"><b>Tell me one thing about your day</b><span>Use the pattern: <strong>I feel ___ because ___.</strong></span><small>Example: I feel happy because I played with my friend.</small></div></div>
      <div class="teacher-check"><span>Грамматические маркеры</span>${["because / connector", "longer answer", "pronunciation"].map((marker) => `<button class="check" type="button" data-marker="${marker}">＋ ${marker}</button>`).join("")}</div>`,
  },
  {
    mins: 5,
    tag: "03 / FAVORITES / 5 MIN",
    title: "Unlock their world",
    note: "Цель: выявить интересы и проверить Present Simple. Попроси объяснить выбор.",
    html: `
      <div class="prompt">“What is your favorite color? Can you find it in your room?”</div>
      <div class="answer-row">${["Red", "Blue", "Green", "Yellow", "Pink", "Purple"].map((color) => `<button class="option color-option" type="button" data-color="${color}">${color}</button>`).join("")}</div>
      <div class="deep-dive"><b>Follow-up</b> “What color is your backpack?” / “Do you wear this color?”</div>
      <div class="prompt">“Do you have a pet? What does it like to do?”</div>
      <div class="answer-row">${["Dog 🐶", "Cat 🐱", "Dragon 🐉", "No pet"].map((pet) => `<button class="option pet-option" type="button" data-pet="${pet}">${pet}</button>`).join("")}</div>
      <div class="deep-dive"><b>Если нет питомца</b> “Would you like a dog, a cat, or a dragon? Why?”</div>
      <div class="teacher-check"><span>Отметь структуру</span>${["Present Simple", "questions back", "adjectives"].map((marker) => `<button class="check" type="button" data-marker="${marker}">＋ ${marker}</button>`).join("")}</div>`,
  },
  {
    mins: 5,
    tag: "04 / HOBBIES / 5 MIN",
    title: "Find the fun",
    note: "Цель: разговорить ученика через выбор. Попроси выбрать 2-3 занятия и составить фразу “I love … because …”.",
    html: `
      <div class="prompt">“What do you love doing after school or at weekends?”</div>
      <div class="hobby-grid">${[["🎨", "Drawing"], ["🎮", "Gaming"], ["💃", "Dancing"], ["⚽", "Sports"], ["📚", "Reading"], ["🧱", "LEGO"], ["🎵", "Music"], ["🚀", "Science"]].map(([icon, hobby]) => `<button class="hobby" type="button" data-hobby="${hobby}">${icon} ${hobby}</button>`).join("")}</div>
      <div class="sentence-card">I love <strong>________</strong> because <strong>________</strong>.</div>
      <div class="deep-dive"><b>Раскрой тему</b> “How often?” / “Who do you do it with?” / “Tell me one cool thing about it.”</div>
      <div class="teacher-check"><span>Связность речи</span>${["and / but", "frequency words", "speaks in phrases"].map((marker) => `<button class="check" type="button" data-marker="${marker}">＋ ${marker}</button>`).join("")}</div>`,
  },
  {
    mins: 6,
    tag: "05 / CHALLENGE / 6 MIN",
    title: "Picture detective",
    note: "Цель: проверить словарь, Present Continuous и воображение. Двигайся от простого к сложному.",
    html: `
      <div class="scene"><img src="assets/superhero-city-detective.jpeg" alt="Иллюстрация с супергероем и предметами для поиска" loading="lazy" /><span class="scene-label">SUPERHERO HQ / LOOK CLOSELY</span></div>
      <div class="prompt">1 / “Look closely! Tell me three things you can see.”</div>
      <div class="answer-row"><input class="answer-input" id="sceneInput" aria-label="Ответ по картинке" placeholder="I can see a… and a…" /></div>
      <div class="prompt">2 / “Where is the telescope? Where is the rocket?”</div>
      <div class="answer-row"><input class="answer-input" id="sceneLocationInput" aria-label="Ответ о расположении предметов" placeholder="The telescope is… / The rocket is…" /></div>
      <div class="prompt">3 / “What are the superhero and robot cat doing?”</div>
      <div class="answer-row"><input class="answer-input" id="imagineInput" aria-label="Ответ о действии персонажей" placeholder="They are…" /></div>
      <div class="teacher-check"><span>Проверь уровень</span>${["Present Continuous", "can / there is", "if-clause / imagination"].map((marker) => `<button class="check" type="button" data-marker="${marker}">＋ ${marker}</button>`).join("")}</div>`,
  },
  {
    mins: 3,
    tag: "06 / THIS OR THAT / 3 MIN",
    title: "Make a choice",
    note: "Цель: быстро проверить реакцию, сравнение и аргументацию. Темп: 20-30 секунд на пару.",
    html: `
      <div class="prompt">“Pizza or burger?”</div>
      <div class="answer-row">${[["🍕 Pizza", "food"], ["🍔 Burger", "food"]].map(([choice, group]) => `<button class="option choice-option" type="button" data-choice="${choice}" data-choice-group="${group}">${choice}</button>`).join("")}</div>
      <div class="prompt">“Summer or winter?”</div>
      <div class="answer-row">${[["☀️ Summer", "season"], ["❄️ Winter", "season"]].map(([choice, group]) => `<button class="option choice-option" type="button" data-choice="${choice}" data-choice-group="${group}">${choice}</button>`).join("")}</div>
      <div class="prompt">“Books or YouTube?”</div>
      <div class="answer-row">${[["📚 Books", "media"], ["▶️ YouTube", "media"]].map(([choice, group]) => `<button class="option choice-option" type="button" data-choice="${choice}" data-choice-group="${group}">${choice}</button>`).join("")}</div>
      <div class="deep-dive"><b>Для A2 / B1</b> “Why do you prefer X to Y?” / “Which is more exciting?”</div>
      <div class="teacher-check"><span>Связки</span>${["because", "prefer", "comparative"].map((marker) => `<button class="check" type="button" data-marker="${marker}">＋ ${marker}</button>`).join("")}</div>`,
  },
  {
    mins: 3,
    tag: "07 / WRAP-UP / 3 MIN",
    title: "Choose a super-goal",
    note: "Цель: завершить на успехе и зафиксировать мотивацию. Вслух назови одну сильную сторону ученика.",
    html: `
      <div class="prompt">“What is one super-cool thing you want to learn in English?”</div>
      <div class="hobby-grid">${[["🎬", "Watch cartoons"], ["🎮", "Talk in games"], ["✈️", "Travel"], ["🏫", "School English"]].map(([icon, goal]) => `<button class="hobby goal-option" type="button" data-goal="${goal}">${icon} ${goal}</button>`).join("")}</div>
      <div class="prompt">“What was your favorite mission today?”</div>
      <div class="answer-row"><input class="answer-input" id="notesInput" aria-label="Заметка преподавателя" placeholder="Teacher note…" /></div>
      <div class="celebrate">⭐ “You were brave, curious and awesome today!”</div>`,
  },
];

const card = document.getElementById("lessonCard");
const profileCard = document.getElementById("profileCard");
const dossier = document.getElementById("dossier");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const appStatus = document.getElementById("appStatus");

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[character]));
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    setStatus("Черновик не сохранился. Продолжайте урок без перезагрузки.", "error");
  }
}

function setStatus(message = "", type = "") {
  appStatus.textContent = message;
  appStatus.className = `status-message${type ? ` ${type}` : ""}`;
}

function updateProfile() {
  const levelPoints = state.markers.length + state.hobbies.length + Object.keys(state.choices).length + (state.name ? 1 : 0) + (state.goal ? 1 : 0);
  const level = levelPoints >= 9 ? "Pre-Intermediate / A2-B1" : levelPoints >= 5 ? "Elementary / A2" : levelPoints >= 2 ? "Beginner / A1" : "Starter / A0";
  const grammar = state.markers.filter((marker) => /Simple|Continuous|because|prefer|if-clause|to be/.test(marker)).slice(-2).join(" / ");
  const favorites = [state.color, state.pet, ...Object.values(state.choices)].filter(Boolean).join(" / ");
  const name = state.name.trim() || "New student";

  document.getElementById("profileName").textContent = name;
  document.getElementById("avatarInitial").textContent = name === "New student" ? "?" : name[0].toUpperCase();
  document.getElementById("profileAge").textContent = state.age ? `${state.age} лет / 30 min mission` : "Имя и возраст появятся здесь";
  document.getElementById("profileHobbies").innerHTML = state.hobbies.length ? state.hobbies.map((hobby) => `<span>${escapeHtml(hobby)}</span>`).join("") : "<i>Добавьте хобби</i>";
  document.getElementById("profileFavorites").textContent = favorites || "Цвет / животное / выборы";
  document.getElementById("profileGoal").textContent = state.goal || "Спросим в финале миссии";
  document.getElementById("profileGrammar").textContent = grammar || "to be / Present Simple";
  document.getElementById("profileLevel").textContent = level;
  document.getElementById("profileSpeaking").textContent = levelPoints >= 7 ? "Строит развернутые фразы" : levelPoints >= 3 ? "Говорит фразами" : "Короткие ответы";
  document.getElementById("levelMeter").style.width = `${Math.min(12 + levelPoints * 8, 100)}%`;
}

function hydrateCurrentStep() {
  const values = { nameInput: state.name, ageInput: state.age, sceneInput: state.scene, sceneLocationInput: state.sceneLocation, imagineInput: state.imagine, notesInput: state.notes };
  Object.entries(values).forEach(([id, value]) => {
    const input = document.getElementById(id);
    if (input) input.value = value || "";
  });

  card.querySelectorAll(".emoji").forEach((button) => button.classList.toggle("selected", button.dataset.feel === state.feel));
  card.querySelectorAll(".feeling-option").forEach((button) => button.classList.toggle("selected", button.dataset.feelphrase === state.feel));
  card.querySelectorAll(".color-option").forEach((button) => button.classList.toggle("selected", button.dataset.color === state.color));
  card.querySelectorAll(".pet-option").forEach((button) => button.classList.toggle("selected", button.dataset.pet === state.pet));
  card.querySelectorAll(".hobby").forEach((button) => button.classList.toggle("selected", button.dataset.goal ? button.dataset.goal === state.goal : state.hobbies.includes(button.dataset.hobby)));
  card.querySelectorAll(".check").forEach((button) => button.classList.toggle("selected", state.markers.includes(button.dataset.marker)));
  card.querySelectorAll(".scene-option").forEach((button) => button.classList.toggle("selected", button.dataset.scene === state.scene));
  card.querySelectorAll(".choice-option").forEach((button) => button.classList.toggle("selected", state.choices[button.dataset.choiceGroup] === button.dataset.choice));
}

function bindInputs() {
  card.querySelectorAll(".emoji").forEach((button) => button.addEventListener("click", () => {
    state.feel = button.dataset.feel;
    card.querySelectorAll(".emoji").forEach((other) => other.classList.toggle("selected", other === button));
    saveState();
    updateProfile();
  }));

  card.querySelectorAll(".feeling-option").forEach((button) => button.addEventListener("click", () => {
    state.feel = button.dataset.feelphrase;
    card.querySelectorAll(".feeling-option").forEach((other) => other.classList.toggle("selected", other === button));
    saveState();
    updateProfile();
  }));

  card.querySelectorAll(".color-option").forEach((button) => button.addEventListener("click", () => {
    state.color = button.dataset.color;
    card.querySelectorAll(".color-option").forEach((other) => other.classList.toggle("selected", other === button));
    saveState();
    updateProfile();
  }));

  card.querySelectorAll(".pet-option").forEach((button) => button.addEventListener("click", () => {
    state.pet = button.dataset.pet;
    card.querySelectorAll(".pet-option").forEach((other) => other.classList.toggle("selected", other === button));
    saveState();
    updateProfile();
  }));

  card.querySelectorAll(".choice-option").forEach((button) => button.addEventListener("click", () => {
    state.choices[button.dataset.choiceGroup] = button.dataset.choice;
    card.querySelectorAll(`.choice-option[data-choice-group="${CSS.escape(button.dataset.choiceGroup)}"]`).forEach((other) => other.classList.toggle("selected", other === button));
    saveState();
    updateProfile();
  }));

  card.querySelectorAll(".check").forEach((button) => button.addEventListener("click", () => {
    const marker = button.dataset.marker;
    state.markers = state.markers.includes(marker) ? state.markers.filter((item) => item !== marker) : [...state.markers, marker];
    button.classList.toggle("selected", state.markers.includes(marker));
    saveState();
    updateProfile();
  }));

  card.querySelectorAll(".hobby").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.goal) {
      state.goal = button.dataset.goal;
      card.querySelectorAll(".goal-option").forEach((other) => other.classList.toggle("selected", other === button));
    } else {
      const hobby = button.dataset.hobby;
      if (state.hobbies.includes(hobby)) state.hobbies = state.hobbies.filter((item) => item !== hobby);
      else if (state.hobbies.length < 3) state.hobbies = [...state.hobbies, hobby];
      else return setStatus("Можно выбрать максимум 3 интереса.");
      button.classList.toggle("selected", state.hobbies.includes(hobby));
    }
    saveState();
    updateProfile();
  }));

  ["nameInput", "ageInput", "sceneInput", "sceneLocationInput", "imagineInput", "notesInput"].forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener("input", () => {
      state[id === "nameInput" ? "name" : id === "ageInput" ? "age" : id === "sceneInput" ? "scene" : id === "sceneLocationInput" ? "sceneLocation" : id === "imagineInput" ? "imagine" : "notes"] = input.value;
      saveState();
      updateProfile();
    });
  });
}

function render() {
  const step = steps[state.step];
  card.innerHTML = `<span class="mission-tag">${step.tag}</span><h2 tabindex="-1">${step.title}</h2><p class="teacher-note">${step.note}</p>${step.html}`;
  document.getElementById("progressFill").style.width = `${((state.step + 1) / steps.length) * 100}%`;
  document.getElementById("progressLabel").textContent = `${state.step + 1} / ${steps.length}`;
  document.getElementById("currentTime").textContent = `${step.mins} MIN`;
  prevBtn.disabled = state.step === 0 || isGenerating;
  nextBtn.disabled = isGenerating;
  nextBtn.innerHTML = state.step === steps.length - 1 ? "GENERATE PROFILE <span aria-hidden=\"true\">↗</span>" : "NEXT MISSION <span aria-hidden=\"true\">→</span>";
  bindInputs();
  hydrateCurrentStep();
  updateProfile();
  window.requestAnimationFrame(() => card.querySelector("h2")?.focus({ preventScroll: true }));
}

function updatePhotoControl() {
  const preview = document.getElementById("photoPreview");
  const fileName = document.getElementById("photoFileName");
  if (state.photo) {
    preview.classList.add("has-photo");
    preview.style.backgroundImage = `url("${state.photo}")`;
    preview.textContent = "";
    fileName.textContent = "Фото готово к генерации";
  } else {
    preview.classList.remove("has-photo");
    preview.style.backgroundImage = "";
    preview.textContent = "+";
    fileName.textContent = "Добавить фото";
  }
}

function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не удалось прочитать фото."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Файл не похож на изображение."));
      image.onload = () => {
        const scale = Math.min(1, 900 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function studentPayload() {
  return {
    name: state.name.trim(),
    age: state.age,
    feeling: state.feel,
    favoriteColor: state.color,
    pet: state.pet,
    hobbies: state.hobbies,
    choices: Object.values(state.choices),
    goal: state.goal,
    markers: state.markers,
    sceneAnswer: state.scene,
    sceneLocation: state.sceneLocation,
    imagination: state.imagine,
    teacherNote: state.notes,
  };
}

function strengthList() {
  const strengths = ["Смело пробует говорить", "Любопытно исследует новое"];
  if (state.markers.some((marker) => /full sentence|speaks in phrases|longer answer/.test(marker))) strengths[0] = "Строит фразы и отвечает развернуто";
  if (state.hobbies[0]) strengths[1] = `Рассказывает о ${state.hobbies[0].toLowerCase()}`;
  return [...strengths, state.goal ? `Знает, зачем учит английский` : "Не боится пробовать новое"];
}

function renderDossier({ status = "ready", message = "Профиль собран", image = generatedImage } = {}) {
  const name = state.name.trim() || "New student";
  const power = /A2|B1/.test(document.getElementById("profileLevel").textContent) ? "CONFIDENT EXPLORER" : "BRAVE BEGINNER";
  const portrait = image ? `<img src="${escapeHtml(image)}" alt="Персональный комикс-портрет ${escapeHtml(name)}" />` : `<span>${escapeHtml(name[0].toUpperCase())}</span>`;
  const statusClass = status === "error" ? "error" : status === "loading" ? "loading" : "ready";
  dossier.hidden = false;
  dossier.className = "dossier open";
  dossier.innerHTML = `
    <div class="dossier-actions">
      <span id="dossierTitle">ФИНАЛЬНАЯ КАРТОЧКА УЧЕНИКА</span>
      <div><button class="ghost-btn" id="regenerateBtn" type="button" ${status === "loading" ? "disabled" : ""}>REGENERATE ↻</button><button class="primary-btn small" id="printBtn" type="button">PRINT / PDF ↗</button></div>
    </div>
    <div class="dossier-status ${statusClass}" role="status">${escapeHtml(message)}</div>
    <div class="hero-card"><div class="hero-photo ${status === "loading" ? "is-loading" : ""}" id="dossierPortrait">${portrait}</div><div class="hero-name"><span class="card-kicker">ДОСЬЕ ГЕРОЯ / STUDENT EDITION</span><h2>${escapeHtml(name.toUpperCase())}</h2><p>${escapeHtml(state.goal ? `Миссия: ${state.goal}` : "Готов к своей английской миссии")}</p><div class="power-badge">${power}</div></div></div>
    <div class="dossier-grid"><article><h3>СУПЕР-СИЛЫ</h3><ul>${strengthList().map((strength) => `<li>${escapeHtml(strength)}</li>`).join("")}</ul></article><article><h3>МИР ИНТЕРЕСОВ</h3><div class="big-chips">${(state.hobbies.length ? state.hobbies : ["Curiosity", "Brave speaking"]).map((hobby) => `<span>${escapeHtml(hobby)}</span>`).join("")}</div><p class="quote">«Каждый ответ поднимает уровень»</p></article><article><h3>МИНИ-МАРШРУТ</h3><p>${escapeHtml(state.goal || "Собрать уверенность и говорить фразами на английском.")}</p>${state.notes ? `<p><strong>Заметка:</strong> ${escapeHtml(state.notes)}</p>` : ""}</article><article class="stamp"><span>QUEST<br />ENGLISH</span><strong>APPROVED<br />BY TEACHER</strong></article></div>`;
  dossier.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("printBtn").addEventListener("click", () => window.print());
  document.getElementById("regenerateBtn").addEventListener("click", () => generateStudentProfile(true));
}

async function generateStudentProfile(force = false) {
  if (isGenerating) return;
  isGenerating = true;
  render();
  renderDossier({ status: "loading", message: force ? "Создаю новый вариант портрета..." : "Создаю персональный портрет...", image: generatedImage });
  setStatus("Генерация может занять до двух минут. Ответы уже сохранены.");

  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 130000);
    const response = await fetch("/api/generate-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student: studentPayload(), photo: state.photo || null, regenerate: force }),
      signal: controller.signal,
    });
    window.clearTimeout(timeout);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.image) throw new Error(data.error || "Сервис генерации не вернул картинку.");
    generatedImage = data.image;
    renderDossier({ status: "ready", message: "Персональный портрет готов", image: generatedImage });
    setStatus("Профиль готов. Его можно распечатать или сгенерировать заново.");
  } catch (error) {
    const message = error.name === "AbortError" ? "Генерация заняла слишком много времени." : error.message;
    renderDossier({ status: "error", message: `${message} Данные профиля сохранены.`, image: generatedImage });
    setStatus("Не удалось получить картинку. Проверьте локальный сервер и попробуйте снова.", "error");
  } finally {
    isGenerating = false;
    render();
  }
}

function resetStudent() {
  if (!window.confirm("Начать профиль нового ученика? Текущий черновик будет очищен.")) return;
  state = blankState();
  generatedImage = "";
  localStorage.removeItem(STORAGE_KEY);
  profileCard.classList.remove("unlocked");
  profileCard.classList.add("sealed");
  document.getElementById("profileStatus").textContent = "LIVE";
  document.getElementById("workspace")?.classList.add("lesson-only");
  dossier.hidden = true;
  dossier.innerHTML = "";
  updatePhotoControl();
  setStatus("Новый профиль готов к уроку.");
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("startBtn").addEventListener("click", () => document.getElementById("workspace").scrollIntoView({ behavior: "smooth", block: "start" }));
document.getElementById("newStudentBtn").addEventListener("click", resetStudent);
document.getElementById("photoInput").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) return setStatus("Выберите изображение JPG, PNG или WebP.", "error");
  if (file.size > 8 * 1024 * 1024) return setStatus("Фото должно быть меньше 8 МБ.", "error");
  try {
    state.photo = await readPhoto(file);
    saveState();
    updatePhotoControl();
    setStatus("Фото уменьшено локально и будет отправлено только при генерации профиля.");
  } catch (error) {
    setStatus(error.message, "error");
  }
});
nextBtn.addEventListener("click", () => {
  if (state.step < steps.length - 1) {
    state.step += 1;
    saveState();
    render();
  } else {
    document.getElementById("workspace")?.classList.remove("lesson-only");
    profileCard.classList.remove("sealed");
    profileCard.classList.add("unlocked");
    document.getElementById("profileStatus").textContent = "READY";
    generateStudentProfile();
  }
});
prevBtn.addEventListener("click", () => {
  if (state.step === 0 || isGenerating) return;
  state.step -= 1;
  saveState();
  render();
});

updatePhotoControl();
render();

function replaceFeelingChoices() {
  const grid = document.querySelector(".emoji-grid");
  if (!grid || grid.dataset.boardReady) return;
  grid.dataset.boardReady = "1";
  const labels = ["cute", "hungry", "sad", "funny", "relax", "scared", "happy", "tired", "angry"];
  grid.innerHTML = `<div class="feeling-board"><img src="assets/how-are-you-today.jpeg" alt="How are you today? Выбери настроение" /><div class="feeling-hotspots">${labels.map((label) => `<button class="feeling-hotspot" type="button" data-feel="${label}" aria-label="${label}"></button>`).join("")}</div></div><p class="board-hint">Нажми на хомячка, который похож на твоё настроение</p>`;
  grid.querySelectorAll(".feeling-hotspot").forEach((button) => button.addEventListener("click", () => {
    grid.querySelectorAll(".feeling-hotspot").forEach((other) => other.classList.toggle("selected", other === button));
    state.feel = button.dataset.feel;
    saveState();
    updateProfile();
  }));
}

function upgradeFeelingsActivity() {
  const option = document.querySelector(".feeling-option");
  if (!option || option.closest(".feelings-upgraded")) return;
  const wrap = document.createElement("div");
  const previous = (state.notes || "").split(" · ");
  wrap.className = "feelings-upgraded";
  wrap.innerHTML = `<div class="reflection-prompt"><span class="prompt-number">01</span><div><b>Tell me 2–3 reasons</b><small>Why are you feeling this way today?</small></div><textarea aria-label="Two or three reasons" placeholder="Because…">${escapeHtml(previous[0] || "")}</textarea></div><div class="reflection-prompt"><span class="prompt-number">02</span><div><b>Good &amp; tricky moments</b><small>Name 2 good things and 2 difficult things from today.</small></div><textarea aria-label="Good and difficult things" placeholder="Two good things… Two difficult things…">${escapeHtml(previous[1] || "")}</textarea><button class="save-reflection" type="button">SAVE MY IDEAS ↗</button></div>`;
  option.parentElement.replaceWith(wrap);
  const updateNotes = () => {
    state.notes = [...wrap.querySelectorAll("textarea")].map((input) => input.value.trim()).filter(Boolean).join(" · ");
    saveState();
    updateProfile();
  };
  wrap.querySelectorAll("textarea").forEach((input) => input.addEventListener("input", updateNotes));
  wrap.querySelector(".save-reflection").addEventListener("click", () => {
    updateNotes();
    wrap.classList.add("saved");
    wrap.querySelector(".save-reflection").textContent = "IDEAS SAVED ✓";
    state.markers = [...new Set([...state.markers, "longer answer", "because / connector"])];
    saveState();
    updateProfile();
  });
}

const lessonObserver = new MutationObserver(() => {
  replaceFeelingChoices();
  upgradeFeelingsActivity();
});
lessonObserver.observe(card, { childList: true, subtree: true });
replaceFeelingChoices();
upgradeFeelingsActivity();
