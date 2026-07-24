/* Theme toggle + quiz engine (vanilla JS, no dependencies). */

/* ---------- i18n (strings follow <html lang>) ---------- */
const COURSE_LANG = (document.documentElement.lang || "fa").slice(0, 2);
const COURSE_STR = {
  fa: {
    quizTitle: "آزمونک درس 🎯",
    score: (c, n) => `نتیجه: ${c} از ${n} درست ${c === n ? "— آفرین! 🏆" : "— دوباره درس را مرور کن و باز امتحان کن."}`,
  },
  en: {
    quizTitle: "Lesson quiz 🎯",
    score: (c, n) => `Score: ${c} of ${n} correct ${c === n ? "— well done! 🏆" : "— review the lesson and try again."}`,
  },
  it: {
    quizTitle: "Quiz della lezione 🎯",
    score: (c, n) => `Punteggio: ${c} su ${n} corrette ${c === n ? "— ottimo lavoro! 🏆" : "— ripassa la lezione e riprova."}`,
  },
}[COURSE_LANG] || {
  quizTitle: "Quiz 🎯",
  score: (c, n) => `${c} / ${n}`,
};

/* ---------- theme ---------- */
(function initTheme() {
  const saved = localStorage.getItem("course-theme");
  if (saved) document.documentElement.dataset.theme = saved;
})();

function toggleTheme() {
  const root = document.documentElement;
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  const current = root.dataset.theme || (dark ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  localStorage.setItem("course-theme", next);
}

/* ---------- quiz ----------
Each lesson defines:  <script type="application/json" id="quiz-data"> [
  {"stem": "...", "options": ["...","..."], "answer": 0, "explain": "..."}
] </script>  and an empty <div id="quiz"></div>. */
document.addEventListener("DOMContentLoaded", () => {
  const dataEl = document.getElementById("quiz-data");
  const host = document.getElementById("quiz");
  if (!dataEl || !host) return;
  const questions = JSON.parse(dataEl.textContent);
  let answered = 0, correct = 0;

  const h2 = document.createElement("h2");
  h2.textContent = COURSE_STR.quizTitle;
  host.appendChild(h2);

  questions.forEach((q, qi) => {
    const qDiv = document.createElement("div");
    qDiv.className = "q";
    const stem = document.createElement("p");
    stem.className = "stem";
    stem.textContent = `${qi + 1}. ${q.stem}`;
    qDiv.appendChild(stem);

    const opts = document.createElement("div");
    opts.className = "opts";
    q.options.forEach((opt, oi) => {
      const btn = document.createElement("button");
      btn.className = "opt";
      btn.textContent = opt;
      btn.addEventListener("click", () => {
        [...opts.children].forEach(b => (b.disabled = true));
        const ok = oi === q.answer;
        btn.classList.add(ok ? "correct" : "wrong");
        btn.textContent = (ok ? "✅ " : "❌ ") + btn.textContent;
        if (!ok) {
          const right = opts.children[q.answer];
          right.classList.add("correct");
          right.textContent = "✅ " + right.textContent;
        }
        qDiv.classList.add("answered");
        answered += 1;
        if (ok) correct += 1;
        if (answered === questions.length) {
          score.textContent = COURSE_STR.score(correct, questions.length);
        }
      });
      opts.appendChild(btn);
    });
    qDiv.appendChild(opts);

    const explain = document.createElement("p");
    explain.className = "explain";
    explain.textContent = q.explain;
    qDiv.appendChild(explain);
    host.appendChild(qDiv);
  });

  const score = document.createElement("p");
  score.className = "score";
  host.appendChild(score);
});
