(() => {
  const card = document.getElementById("lessonCard");
  if (!card) return;

  let timerId = null;
  let remaining = 30;

  function enhanceBonusQuestions() {
    card.querySelectorAll(".deep-dive").forEach((item) => {
      if (item.dataset.enhanced) return;
      item.dataset.enhanced = "true";
      const title = item.querySelector("b")?.textContent.trim() || "Bonus question";
      const content = [...item.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent.trim()).join(" ");
      const wrapper = document.createElement("div");
      wrapper.className = "reveal-wrap";
      wrapper.innerHTML = `<button class="reveal-btn" type="button">＋ ${title}</button><div class="reveal-panel"><b>Next level</b><div>${content}</div><div class="student-action"><button class="timer-btn" type="button">START 30 SEC</button><span class="timer-display tabular-nums"></span></div></div>`;
      item.replaceWith(wrapper);
    });
  }

  card.addEventListener("click", (event) => {
    const reveal = event.target.closest(".reveal-btn");
    if (reveal) {
      const panel = reveal.nextElementSibling;
      const open = panel.classList.toggle("show");
      reveal.classList.toggle("open", open);
      reveal.textContent = open ? "− HIDE BONUS" : `＋ ${reveal.textContent.replace(/^[-＋] /, "")}`;
      return;
    }

    const timer = event.target.closest(".timer-btn");
    if (!timer) return;
    const display = timer.parentElement.querySelector(".timer-display");
    if (timerId) {
      window.clearInterval(timerId);
      timerId = null;
      timer.classList.remove("active");
      timer.textContent = "RESUME 30 SEC";
      return;
    }
    remaining = 30;
    timer.classList.add("active");
    timer.textContent = "PAUSE";
    display.textContent = "00:30";
    timerId = window.setInterval(() => {
      remaining -= 1;
      display.textContent = `00:${String(remaining).padStart(2, "0")}`;
      if (remaining <= 0) {
        window.clearInterval(timerId);
        timerId = null;
        timer.classList.remove("active");
        timer.textContent = "TRY AGAIN";
        display.textContent = "TIME";
      }
    }, 1000);
  });

  const observer = new MutationObserver(enhanceBonusQuestions);
  observer.observe(card, { childList: true, subtree: true });
  enhanceBonusQuestions();
})();
