const STORAGE_KEY = "vidya-ai-v1";
const DATASET_URL = "./dataset.json";
const DIALECTS = ["en", "hi", "rural_hindi", "bhojpuri", "maithili", "bundeli"];
const DIALECT_LABELS = {
  en: "English",
  hi: "हिन्दी",
  rural_hindi: "Rural Hindi",
  bhojpuri: "Bhojpuri",
  maithili: "Maithili",
  bundeli: "Bundeli"
};
const FALLBACK_DATASET = {
  curriculum: [
    {
      id: "sci_bio_01", grade: 6, subject: "Science", topic: "Photosynthesis (प्रकाश संश्लेषण)",
      standard_definitions: {
        en: "Green plants use sunlight, water, and carbon dioxide to make food and release oxygen.",
        hi: "हरे पौधे धूप, पानी और कार्बन डाइऑक्साइड से भोजन बनाते हैं और ऑक्सीजन छोड़ते हैं।"
      },
      dialect_adaptations: {
        rural_hindi: { title: "पेड़-पौधों की अपनी रसोई", explanation: "हरी पत्तियां धूप, पानी और हवा लेकर अपने लिए भोजन बनाती हैं।", metaphor: "पत्ती पेड़ की रसोई है और धूप चूल्हे की आग है।" }
      },
      audio_prompts: { en: "Plants make food using sunlight, water, and air.", hi: "पौधे धूप, पानी और हवा से अपना भोजन बनाते हैं।" },
      quiz_pool: [
        {
          question_id: "fallback_photo", difficulty: 1,
          question_text: { en: "What is the main energy source plants use to make food?", hi: "पौधे भोजन बनाने के लिए मुख्य रूप से किस ऊर्जा का उपयोग करते हैं?" },
          options: [
            { id: "a", text: "Sunlight (सूर्य प्रकाश)", is_correct: true },
            { id: "b", text: "Moonlight (चांदनी)", is_correct: false },
            { id: "c", text: "Firewood (लकड़ी)", is_correct: false }
          ],
          gap_tag: "ENERGY_SOURCE_CONFUSION",
          remedial_insight: "Like a solar cooker, green leaves need sunlight."
        },
        {
          question_id: "fallback_photo_harder", difficulty: 2,
          question_text: { en: "Which gas do plants release that people need to breathe?", hi: "पौधे कौन सी गैस छोड़ते हैं जिसकी लोगों को सांस लेने के लिए ज़रूरत होती है?" },
          options: [
            { id: "a", text: "Oxygen (ऑक्सीजन)", is_correct: true },
            { id: "b", text: "Carbon dioxide (कार्बन डाइऑक्साइड)", is_correct: false },
            { id: "c", text: "Smoke (धुआं)", is_correct: false }
          ],
          gap_tag: "GAS_EXCHANGE_CONFUSION",
          remedial_insight: "Plants release oxygen into the air."
        }
      ]
    },
    {
      id: "math_num_01", grade: 5, subject: "Mathematics", topic: "Fractions (भिन्न और बंटवारा)",
      standard_definitions: {
        en: "A fraction represents equal parts of a whole.",
        hi: "भिन्न किसी पूरी वस्तु के बराबर भागों को बताती है।"
      },
      dialect_adaptations: {
        rural_hindi: { title: "रोटी और खेत का बंटवारा", explanation: "एक पूरी रोटी को दो बराबर टुकड़ों में बांटें, तो हर टुकड़ा आधा यानी 1/2 है।", metaphor: "एक खेत को बराबर हिस्सों में बांटने से भिन्न समझ आती है।" }
      },
      audio_prompts: { en: "Fractions mean equal parts of a whole thing.", hi: "भिन्न का मतलब है किसी पूरी चीज़ का बराबर-बराबर बंटवारा।" },
      quiz_pool: [
        {
          question_id: "fallback_fraction", difficulty: 1,
          question_text: { en: "One field is shared equally between two children. What fraction does each get?", hi: "एक खेत दो बच्चों में बराबर बांटा जाए, तो हर बच्चे को कितना हिस्सा मिलेगा?" },
          options: [
            { id: "a", text: "1/2 (आधा)", is_correct: true },
            { id: "b", text: "1/4 (चौथाई)", is_correct: false },
            { id: "c", text: "2/1 (दो पूरे खेत)", is_correct: false }
          ],
          gap_tag: "BASIC_RATIO_ERROR",
          remedial_insight: "Two equal shares make one half for each child."
        },
        {
          question_id: "fallback_fraction_harder", difficulty: 2,
          question_text: { en: "Three of four equal parts of a field are planted. What fraction is planted?", hi: "खेत के 4 बराबर हिस्सों में से 3 में फसल बोई गई। कितना हिस्सा बोया गया?" },
          options: [
            { id: "a", text: "3/4 (तीन चौथाई)", is_correct: true },
            { id: "b", text: "1/3 (एक तिहाई)", is_correct: false },
            { id: "c", text: "1/4 (एक चौथाई)", is_correct: false }
          ],
          gap_tag: "DENOMINATOR_MISUNDERSTANDING",
          remedial_insight: "Four equal parts make the whole; three planted parts are 3/4."
        }
      ]
    }
  ],
  teacher_analytics_seed: {
    total_students_enrolled: 0,
    rural_hub: "Local Learning Center",
    common_misconceptions: []
  }
};

let dataset = FALLBACK_DATASET;
let state = {
  profile: { name: "" },
  dialect: "rural_hindi",
  selectedTopicId: "",
  attempts: [],
  mastery: {},
  difficultyByTopic: {},
  activityDates: []
};
let storageAvailable = true;
let activeQuestion = null;
let answered = false;

const byId = (id) => document.getElementById(id);
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[character]));

function showMessage(message) {
  byId("app-message").textContent = message;
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === "object") {
      state = {
        ...state,
        ...parsed,
        profile: { name: String(parsed.profile?.name ?? "") },
        attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
        mastery: parsed.mastery && typeof parsed.mastery === "object" ? parsed.mastery : {},
        difficultyByTopic: parsed.difficultyByTopic && typeof parsed.difficultyByTopic === "object" ? parsed.difficultyByTopic : {},
        activityDates: Array.isArray(parsed.activityDates) ? parsed.activityDates : [],
        dialect: DIALECTS.includes(parsed.dialect) ? parsed.dialect : "rural_hindi"
      };
    }
  } catch (error) {
    console.warn("Vidya.AI could not read saved progress; starting with an empty profile.", error);
    showMessage("Saved progress could not be read. New progress will be saved on this device.");
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageAvailable = true;
    byId("storage-note").textContent = "Progress is saved on this device";
  } catch (error) {
    storageAvailable = false;
    console.error("Vidya.AI could not save progress to this device.", error);
    byId("storage-note").textContent = "Progress is only available until this page closes";
    showMessage("This browser could not save progress. You can keep learning, but it may not remain after closing the page.");
  }
}

async function loadDataset() {
  try {
    const response = await fetch(DATASET_URL);
    if (!response.ok) throw new Error(`Dataset request failed: ${response.status}`);
    const loaded = await response.json();
    if (!Array.isArray(loaded.curriculum) || loaded.curriculum.length === 0) {
      throw new Error("Dataset is missing curriculum topics.");
    }
    dataset = loaded;
  } catch (error) {
    dataset = FALLBACK_DATASET;
    console.warn("Vidya.AI is using its built-in starter lessons.", error);
    showMessage("Starter lessons are ready. The full curriculum file is unavailable right now.");
  }
}

function getTopic(topicId = state.selectedTopicId) {
  return dataset.curriculum.find((topic) => topic.id === topicId) || dataset.curriculum[0];
}

function getTopicName(topic) {
  return topic.topic.split(" (")[0];
}

function getSelectedDialect() {
  return DIALECTS.includes(state.dialect) ? state.dialect : "rural_hindi";
}

function getLocalizedQuestion(question) {
  const lang = getSelectedDialect();
  const fallbackLanguages = lang === "en" ? ["en", "hi"] : ["hi", "en"];
  return question.question_text?.[lang] ||
    fallbackLanguages.map((language) => question.question_text?.[language]).find(Boolean) ||
    Object.values(question.question_text || {})[0] ||
    "Choose the best answer.";
}

function formatLanguageCode(lang) {
  if (lang === "hi" || lang === "bhojpuri" || lang === "maithili" || lang === "bundeli" || lang === "rural_hindi") return "hi-IN";
  return "en-IN";
}

function renderTopics() {
  const topicList = byId("topic-list");
  topicList.innerHTML = "";
  const icons = ["🌿", "🌾", "📘", "✨"];
  dataset.curriculum.forEach((topic, index) => {
    const mastery = state.mastery[topic.id];
    const mastered = mastery?.total ? Math.round((mastery.correct / mastery.total) * 100) : 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `topic-card${topic.id === state.selectedTopicId ? " is-selected" : ""}`;
    button.setAttribute("aria-pressed", String(topic.id === state.selectedTopicId));
    button.innerHTML = `<span class="topic-emoji" aria-hidden="true">${icons[index % icons.length]}</span>
      <span><h3>${escapeHTML(getTopicName(topic))}</h3><p>Grade ${escapeHTML(topic.grade)} · ${mastered}% mastery so far</p></span>
      <span class="topic-arrow" aria-hidden="true">→</span>`;
    button.addEventListener("click", () => selectTopic(topic.id));
    topicList.append(button);
  });
}

function selectTopic(topicId) {
  state.selectedTopicId = topicId;
  state.difficultyByTopic[topicId] = state.difficultyByTopic[topicId] || 1;
  activeQuestion = null;
  answered = false;
  renderTopics();
  renderExplanation();
  renderNextQuestion();
  saveState();
}

function renderExplanation(remedialText = "") {
  const topic = getTopic();
  const dialect = getSelectedDialect();
  const adaptationKey = dialect === "bundeli" ? "rural_hindi" : dialect;
  const adaptation = topic.dialect_adaptations?.[adaptationKey];
  const standardText = topic.standard_definitions?.[dialect] ||
    topic.standard_definitions?.[dialect === "bundeli" || dialect === "rural_hindi" ? "hi" : "en"] ||
    topic.standard_definitions?.en || "";
  const title = adaptation?.title || getTopicName(topic);
  const explanation = adaptation?.explanation || standardText;
  const metaphor = adaptation?.metaphor;
  const metaphorLabel = dialect === "en" ? "Think of it this way:" :
    dialect === "bhojpuri" ? "एह तरह समझीं:" :
      dialect === "maithili" ? "एहि तरह बुझू:" : "इसे ऐसे समझें:";
  const remedialLabel = dialect === "en" ? "Try this idea:" :
    dialect === "bhojpuri" ? "एह बात के याद रखीं:" :
      dialect === "maithili" ? "ई बात मोन राखू:" : "इसे याद रखें:";
  const lang = dialect === "bundeli" && !topic.dialect_adaptations?.bundeli ? "rural_hindi" : dialect;
  const note = dialect === "bundeli" && !topic.dialect_adaptations?.bundeli
    ? `<small class="fallback-note">Using the available rural Hindi explanation for this topic.</small>` : "";
  const remedial = remedialText
    ? `<p class="metaphor"><strong>${escapeHTML(remedialLabel)}</strong> ${escapeHTML(remedialText)}</p>` : "";
  byId("explanation-content").innerHTML = `<h3>${escapeHTML(title)}</h3>
    <p>${escapeHTML(explanation)}</p>
    ${metaphor ? `<p class="metaphor"><strong>${escapeHTML(metaphorLabel)}</strong> ${escapeHTML(metaphor)}</p>` : ""}
    ${remedial}${note}`;
  byId("read-aloud-button").dataset.language = formatLanguageCode(lang);
}

function selectQuestion(topic, targetDifficulty, lastQuestionId = "") {
  const pool = Array.isArray(topic.quiz_pool) ? topic.quiz_pool : [];
  if (!pool.length) return null;
  const bestDistance = Math.min(...pool.map((question) => Math.abs((Number(question.difficulty) || 1) - targetDifficulty)));
  const nearest = pool.filter((question) => Math.abs((Number(question.difficulty) || 1) - targetDifficulty) === bestDistance);
  const alternatives = nearest.filter((question) => question.question_id !== lastQuestionId);
  const choices = alternatives.length ? alternatives : nearest;
  return choices[Math.floor(Math.random() * choices.length)];
}

function renderNextQuestion() {
  const topic = getTopic();
  if (!topic) return;
  const targetDifficulty = Math.max(1, Math.min(3, Number(state.difficultyByTopic[topic.id]) || 1));
  activeQuestion = selectQuestion(topic, targetDifficulty, activeQuestion?.question_id);
  answered = false;
  byId("difficulty-badge").textContent = `Level ${targetDifficulty}`;
  if (!activeQuestion) {
    byId("quiz-content").innerHTML = `<p class="empty-note">No practice questions are available for this topic yet.</p>`;
    return;
  }
  const options = activeQuestion.options.map((option) => `
    <button type="button" class="answer-option" data-option-id="${escapeHTML(option.id)}">${escapeHTML(option.text)}</button>`).join("");
  const completed = state.attempts.filter((attempt) => attempt.topicId === topic.id).length;
  byId("quiz-content").innerHTML = `<p class="question-text" tabindex="-1">${escapeHTML(getLocalizedQuestion(activeQuestion))}</p>
    <div class="answer-list" role="group" aria-label="Answer options">${options}</div>
    <div id="quiz-feedback" aria-live="polite"></div>
    <div class="quiz-actions"><span class="quiz-progress">${completed} question${completed === 1 ? "" : "s"} tried in this topic</span>
      <button id="next-question-button" class="button hidden" type="button">Next question</button></div>`;
  byId("quiz-content").querySelectorAll(".answer-option").forEach((button) => {
    button.addEventListener("click", () => submitAnswer(button.dataset.optionId));
  });
  byId("quiz-content").querySelector(".question-text").focus({ preventScroll: true });
}

function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function calculateStreak() {
  const dates = [...new Set(state.activityDates)].sort().reverse();
  if (!dates.length) return 0;
  const today = new Date();
  const todayString = todayKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  let expected = dates[0] === todayString ? todayString : todayKey(yesterday);
  let streak = 0;
  for (const date of dates) {
    if (date !== expected) break;
    streak += 1;
    const previous = new Date(`${expected}T12:00:00`);
    previous.setDate(previous.getDate() - 1);
    expected = todayKey(previous);
  }
  return streak;
}

function localizedRemedial(question, topic) {
  const dialect = getSelectedDialect();
  const adaptation = topic.dialect_adaptations?.[dialect] ||
    topic.dialect_adaptations?.[dialect === "bundeli" ? "rural_hindi" : "rural_hindi"];
  const analogy = adaptation?.metaphor || topic.standard_definitions?.hi || topic.standard_definitions?.en;
  const supplemental = dialect === "en" || dialect === "hi"
    ? question.remedial_insight || ""
    : "";
  return [analogy, supplemental].filter(Boolean).join(" ");
}

function submitAnswer(optionId) {
  if (answered || !activeQuestion) return;
  const topic = getTopic();
  const selectedOption = activeQuestion.options.find((option) => option.id === optionId);
  if (!selectedOption) return;
  answered = true;
  const correct = Boolean(selectedOption.is_correct);
  const stamp = new Date();
  state.attempts.push({
    id: `${stamp.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    student: state.profile.name.trim() || "Learner",
    topicId: topic.id,
    topic: getTopicName(topic),
    questionId: activeQuestion.question_id,
    gapTag: activeQuestion.gap_tag || "GENERAL_REVIEW",
    difficulty: Number(activeQuestion.difficulty) || 1,
    correct,
    timestamp: stamp.toISOString()
  });
  const mastery = state.mastery[topic.id] || { correct: 0, total: 0 };
  mastery.total += 1;
  if (correct) mastery.correct += 1;
  state.mastery[topic.id] = mastery;
  state.activityDates.push(todayKey(stamp));
  state.activityDates = [...new Set(state.activityDates)].slice(-365);
  const currentDifficulty = Number(state.difficultyByTopic[topic.id]) || 1;
  state.difficultyByTopic[topic.id] = correct ? Math.min(3, currentDifficulty + 1) : Math.max(1, currentDifficulty - 1);

  byId("quiz-content").querySelectorAll(".answer-option").forEach((button) => {
    button.disabled = true;
    const choice = activeQuestion.options.find((option) => option.id === button.dataset.optionId);
    if (choice?.is_correct) button.classList.add("is-correct");
    if (button.dataset.optionId === optionId && !correct) button.classList.add("is-wrong");
  });
  const feedback = byId("quiz-feedback");
  const dialect = getSelectedDialect();
  if (correct) {
    const praise = dialect === "hi" || dialect === "rural_hindi" || dialect === "bundeli" ? "बहुत अच्छे! सही जवाब।" :
      dialect === "bhojpuri" ? "बहुत बढ़िया! सही जवाब।" : "Well done! That is correct.";
    const detail = dialect === "en"
      ? (activeQuestion.remedial_insight || "You are building your skills with every answer.")
      : localizedRemedial(activeQuestion, topic);
    feedback.innerHTML = `<p class="feedback"><strong>${escapeHTML(praise)}</strong>${escapeHTML(detail)}</p>`;
  } else {
    const heading = dialect === "hi" || dialect === "rural_hindi" || dialect === "bundeli" ? "कोई बात नहीं — चलो इसे समझते हैं।" :
      dialect === "bhojpuri" ? "कवनो बात नइखे — फेर से समझीं।" : "That is okay — let us work it out together.";
    const remediation = localizedRemedial(activeQuestion, topic);
    feedback.innerHTML = `<p class="feedback"><strong>${escapeHTML(heading)}</strong>
      <span>Learning gap: ${escapeHTML(activeQuestion.gap_tag || "GENERAL_REVIEW").replaceAll("_", " ")}</span></p>`;
    renderExplanation(remediation);
  }
  byId("next-question-button").classList.remove("hidden");
  byId("next-question-button").focus();
  byId("next-question-button").addEventListener("click", renderNextQuestion, { once: true });
  updateStudentSummary();
  renderTopics();
  renderTeacherDashboard();
  saveState();
}

function updateStudentSummary() {
  const correct = Object.values(state.mastery).reduce((sum, item) => sum + (Number(item.correct) || 0), 0);
  const total = Object.values(state.mastery).reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  byId("mastery-score").textContent = total ? String(Math.round(correct / total * 100)) : "0";
  const streak = calculateStreak();
  byId("streak-count").textContent = String(streak);
  byId("streak-count").nextElementSibling.textContent = streak === 1 ? " day" : " days";
  byId("quiz-count").textContent = String(state.attempts.length);
  byId("student-greeting").textContent = state.profile.name.trim() || "learner";
  byId("student-name").value = state.profile.name;
}

function renderTeacherFilters() {
  const topicFilter = byId("topic-filter");
  const selectedTopic = topicFilter.value;
  topicFilter.innerHTML = `<option value="all">All topics</option>` + dataset.curriculum
    .map((topic) => `<option value="${escapeHTML(topic.id)}">${escapeHTML(getTopicName(topic))}</option>`).join("");
  topicFilter.value = dataset.curriculum.some((topic) => topic.id === selectedTopic) ? selectedTopic : "all";

  const studentFilter = byId("student-filter");
  const selectedStudent = studentFilter.value;
  const students = [...new Set(state.attempts.map((attempt) => attempt.student).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  studentFilter.innerHTML = `<option value="all">Whole class</option>` + students
    .map((student) => `<option value="${escapeHTML(student)}">${escapeHTML(student)}</option>`).join("");
  studentFilter.value = students.includes(selectedStudent) ? selectedStudent : "all";
}

function getFilteredAttempts() {
  const topic = byId("topic-filter").value;
  const student = byId("student-filter").value;
  const difficulty = byId("difficulty-filter").value;
  return state.attempts.filter((attempt) =>
    (topic === "all" || attempt.topicId === topic) &&
    (student === "all" || attempt.student === student) &&
    (difficulty === "all" || Number(attempt.difficulty) === Number(difficulty))
  );
}

function getGapKeyLabel(gapTag) {
  const labels = {
    GAS_EXCHANGE_CONFUSION: "Gas exchange and breathing",
    ENERGY_SOURCE_CONFUSION: "Plant energy sources",
    BASIC_RATIO_ERROR: "Equal sharing and fractions",
    UNIT_CONFUSION: "Understanding units",
    DENOMINATOR_MISUNDERSTANDING: "Understanding the denominator"
  };
  return labels[gapTag] || String(gapTag).toLowerCase().replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

function interventionFor(topicName, gapTag) {
  const seed = dataset.teacher_analytics_seed?.common_misconceptions?.find((item) =>
    item.gap_tag === gapTag && topicName.toLowerCase().includes(item.topic.toLowerCase())
  );
  if (seed?.recommended_action) return seed.recommended_action;
  if (topicName.toLowerCase().includes("fraction")) {
    return "Review hands-on fractions using chapati or land-partition metaphors, then let learners fold paper into equal shares.";
  }
  if (topicName.toLowerCase().includes("photo")) {
    return "Use a leaf and a kitchen-chulha analogy to revisit how sunlight helps plants make food; contrast breathing in and out for gases.";
  }
  return "Revisit the prerequisite idea with a familiar object, demonstrate it together, and invite learners to explain it in their own words.";
}

function renderTeacherDashboard() {
  renderTeacherFilters();
  const filteredAttempts = getFilteredAttempts();
  const topicId = byId("topic-filter").value;
  const student = byId("student-filter").value;
  const difficulty = byId("difficulty-filter").value;
  const seedAllowed = student === "all" && difficulty === "all";
  const seeds = (dataset.teacher_analytics_seed?.common_misconceptions || [])
    .filter((item) => topicId === "all" || dataset.curriculum.find((topic) => topic.id === topicId)?.topic.toLowerCase().includes(item.topic.toLowerCase()));
  const groups = new Map();

  filteredAttempts.forEach((attempt) => {
    const key = `${attempt.topicId}|${attempt.gapTag}`;
    if (!groups.has(key)) groups.set(key, {
      topicId: attempt.topicId, topic: attempt.topic, gapTag: attempt.gapTag,
      total: 0, incorrect: 0, students: new Set()
    });
    const group = groups.get(key);
    group.total += 1;
    if (!attempt.correct) group.incorrect += 1;
    group.students.add(attempt.student);
  });

  let cards = [...groups.values()].map((group) => ({
    topicId: group.topicId,
    topic: group.topic,
    gapTag: group.gapTag,
    affected: group.total ? Math.round(group.incorrect / group.total * 100) : 0,
    count: `${group.incorrect} incorrect of ${group.total} responses`,
    students: group.students.size
  }));
  if (seedAllowed) {
    const represented = new Set(cards.map((card) => `${card.topicId}|${card.gapTag}`));
    const missingSeeds = seeds.filter((seed) => {
      const topic = dataset.curriculum.find((item) => item.topic.toLowerCase().includes(seed.topic.toLowerCase()));
      return !represented.has(`${topic?.id || ""}|${seed.gap_tag}`);
    }).map((seed) => {
      const topic = dataset.curriculum.find((item) => item.topic.toLowerCase().includes(seed.topic.toLowerCase()));
      return {
        topicId: topic?.id || "",
        topic: seed.topic,
        gapTag: seed.gap_tag,
        affected: Number(seed.affected_percentage) || 0,
        count: "Starter class diagnostic",
        students: null,
        action: seed.recommended_action
      };
    });
    cards = cards.concat(missingSeeds);
  }
  cards.sort((a, b) => b.affected - a.affected);
  byId("response-total").textContent = String(filteredAttempts.length);
  byId("gap-total").textContent = String(cards.filter((card) => card.affected > 0).length);
  byId("enrolment-count").textContent = String(dataset.teacher_analytics_seed?.total_students_enrolled ?? 0);
  byId("hub-caption").textContent = `${dataset.teacher_analytics_seed?.rural_hub || "Learning Center"} · Class snapshot`;
  byId("teacher-empty-state").classList.toggle("hidden", cards.length > 0);
  byId("heatmap").innerHTML = cards.map((card) => `
    <article class="gap-card">
      <div class="gap-topline"><div><h3>${escapeHTML(card.topic)} · ${escapeHTML(getGapKeyLabel(card.gapTag))}</h3>
        <span class="gap-subtitle">${escapeHTML(card.gapTag)} · ${card.students === null ? "Seed class data" : `${card.students} student${card.students === 1 ? "" : "s"} represented`}</span></div>
        <strong class="gap-pct">${escapeHTML(card.affected)}%</strong></div>
      <div class="bar-track" role="img" aria-label="${escapeHTML(card.affected)} percent of responses incorrect"><div class="bar-fill" style="width:${Math.max(0, Math.min(100, Number(card.affected)))}%"></div></div>
      <div class="gap-meta">${escapeHTML(card.count)}${card.action ? ` · ${escapeHTML(card.action)}` : ""}</div>
    </article>`).join("");
  const actionable = cards.slice(0, 3);
  byId("intervention-list").innerHTML = actionable.length
    ? actionable.map((card) => `<p class="intervention-item"><strong>${escapeHTML(card.topic)}:</strong> ${escapeHTML(card.action || interventionFor(card.topic, card.gapTag))}</p>`).join("")
    : `<p class="intervention-item">As students practise, this space will suggest a focused, hands-on lesson based on their answers.</p>`;
}

function setMode(mode) {
  const teacher = mode === "teacher";
  byId("student-dashboard").classList.toggle("hidden", teacher);
  byId("teacher-dashboard").classList.toggle("hidden", !teacher);
  byId("student-mode-button").classList.toggle("is-active", !teacher);
  byId("teacher-mode-button").classList.toggle("is-active", teacher);
  byId("student-mode-button").setAttribute("aria-pressed", String(!teacher));
  byId("teacher-mode-button").setAttribute("aria-pressed", String(teacher));
  if (teacher) renderTeacherDashboard();
}

function updateNetworkStatus() {
  const online = navigator.onLine;
  const badge = byId("network-status");
  badge.classList.toggle("is-offline", !online);
  byId("network-label").textContent = online ? "Online" : "Offline · lessons saved";
}

function readExplanationAloud() {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    showMessage("Read aloud is not available in this browser. You can still use the written explanation.");
    return;
  }
  const topic = getTopic();
  const dialect = getSelectedDialect();
  const prompt = topic.audio_prompts?.[dialect] ||
    topic.audio_prompts?.[dialect === "bundeli" || dialect === "rural_hindi" || dialect === "maithili" ? "hi" : "en"] ||
    byId("explanation-content").innerText;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(prompt);
  utterance.lang = formatLanguageCode(dialect);
  window.speechSynthesis.speak(utterance);
}

async function init() {
  loadState();
  updateNetworkStatus();
  byId("dialect-select").value = state.dialect;
  byId("profile-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = byId("student-name").value.trim().slice(0, 32);
    state.profile.name = name;
    updateStudentSummary();
    renderTeacherDashboard();
    saveState();
    showMessage(name ? `Welcome, ${name}. Your progress is saved on this device.` : "Your name was cleared.");
  });
  byId("dialect-select").addEventListener("change", (event) => {
    state.dialect = DIALECTS.includes(event.target.value) ? event.target.value : "rural_hindi";
    renderExplanation();
    if (activeQuestion && !answered) renderNextQuestion();
    saveState();
  });
  byId("read-aloud-button").addEventListener("click", readExplanationAloud);
  byId("student-mode-button").addEventListener("click", () => setMode("student"));
  byId("teacher-mode-button").addEventListener("click", () => setMode("teacher"));
  ["topic-filter", "student-filter", "difficulty-filter"].forEach((id) =>
    byId(id).addEventListener("change", renderTeacherDashboard)
  );
  byId("clear-filters").addEventListener("click", () => {
    byId("topic-filter").value = "all";
    byId("student-filter").value = "all";
    byId("difficulty-filter").value = "all";
    renderTeacherDashboard();
  });
  window.addEventListener("online", updateNetworkStatus);
  window.addEventListener("offline", updateNetworkStatus);

  await loadDataset();
  if (!dataset.curriculum.some((topic) => topic.id === state.selectedTopicId)) {
    state.selectedTopicId = dataset.curriculum[0].id;
  }
  renderTopics();
  updateStudentSummary();
  renderExplanation();
  renderNextQuestion();
  renderTeacherDashboard();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Vidya.AI could not register offline support.", error);
      showMessage("Offline caching could not be enabled. Learning is still available while this page is open.");
    });
  }
}

init();
