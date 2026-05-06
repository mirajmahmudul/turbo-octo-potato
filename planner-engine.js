/**
 * SCHOLR — Study Planner AI Engine
 * Updated to accept custom topics per subject from file uploads.
 */
const TOPIC_BANKS = {
  default: [
    "Introduction & fundamentals",
    "Core concepts — Part 1",
    "Core concepts — Part 2",
    "Key theories and frameworks",
    "Applied problems — Set 1",
    "Applied problems — Set 2",
    "Common patterns & formulas",
    "Past paper questions",
    "Weak areas review",
    "Full topic consolidation",
  ],
  mathematics: [
    "Algebra & equations",
    "Functions and graphs",
    "Calculus — differentiation",
    "Calculus — integration",
    "Trigonometry",
    "Vectors & matrices",
    "Statistics & probability",
    "Problem-solving techniques",
    "Timed practice problems",
    "Formula sheet review",
  ],
  physics: [
    "Mechanics & motion",
    "Forces and Newton's laws",
    "Energy, work & power",
    "Waves and optics",
    "Electricity & circuits",
    "Magnetism",
    "Thermodynamics",
    "Modern physics",
    "Calculation practice",
    "Diagram & definition review",
  ],
  chemistry: [
    "Atomic structure",
    "Periodic table trends",
    "Chemical bonding",
    "Stoichiometry & equations",
    "Acids, bases & salts",
    "Organic chemistry basics",
    "Reaction rates & equilibrium",
    "Electrochemistry",
    "Practical methods",
    "Past paper calculations",
  ],
  biology: [
    "Cell structure & function",
    "DNA, genetics & inheritance",
    "Photosynthesis & respiration",
    "Human body systems",
    "Ecology & ecosystems",
    "Evolution & natural selection",
    "Classification of organisms",
    "Hormones & homeostasis",
    "Experimental methods",
    "Essay & diagram practice",
  ],
  history: [
    "Timeline & key events",
    "Causes and context",
    "Key figures and roles",
    "Political developments",
    "Social and economic factors",
    "Primary source analysis",
    "Historiography & debate",
    "Essay structure practice",
    "Comparison across periods",
    "Past paper essay plans",
  ],
  english: [
    "Text analysis techniques",
    "Themes and motifs",
    "Character development",
    "Language and structure",
    "Context and writer's intent",
    "Comparison essays",
    "Creative writing practice",
    "Grammar & punctuation",
    "Timed essay practice",
    "Model answer review",
  ],
  geography: [
    "Physical landscapes",
    "Human geography",
    "Climate & weather systems",
    "Population & urbanisation",
    "Resource management",
    "Development & inequality",
    "Case studies review",
    "Map & data skills",
    "Fieldwork methods",
    "Exam technique practice",
  ],
  economics: [
    "Supply & demand",
    "Market structures",
    "Macroeconomics overview",
    "Fiscal & monetary policy",
    "International trade",
    "Economic indicators",
    "Diagrams & evaluation",
    "Case study analysis",
    "Evaluation & essay skills",
    "Past paper practice",
  ],
  programming: [
    "Syntax & fundamentals",
    "Data structures",
    "Algorithms & complexity",
    "Object-oriented concepts",
    "Functions & recursion",
    "Debugging techniques",
    "Design patterns",
    "Testing methods",
    "Problem-solving practice",
    "Code review & optimisation",
  ],
};

function getTopicBank(subjectName) {
  const key = subjectName.toLowerCase().trim();
  for (const [k, topics] of Object.entries(TOPIC_BANKS)) {
    if (key.includes(k)) return [...topics];
  }
  return [...TOPIC_BANKS.default];
}

function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function formatDate(date) {
  return date.toISOString().split("T")[0];
}
function dayLabel(date) {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
function daysBetween(a, b) {
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

const PALETTE = [
  "#c8521a", "#2a4d3e", "#1a4d6e", "#6e2a4d", "#4d6e1a",
  "#6e4d1a", "#1a6e6e", "#4d1a6e", "#6e1a2a", "#1a6e3a",
];

function assignColors(subjects) {
  return subjects.map((s, i) => ({
    ...s,
    color: PALETTE[i % PALETTE.length],
  }));
}

function priorityScore(subject, today) {
  const exam = parseDate(subject.examDate);
  const daysRemaining = Math.max(daysBetween(today, exam), 1);
  const totalDays = Math.max(subject._totalDays || daysRemaining, 1);
  const urgency = totalDays / daysRemaining;
  return subject.difficulty * subject.priority * urgency;
}

function reviewOffsets(totalDaysAvailable) {
  const offsets = [1, 2, 4, 7, 12, 20, 30];
  return offsets.filter((o) => o < totalDaysAvailable);
}

export function generatePlan(input) {
  const { subjects, startDate, dailyHours, studyStyle } = input;

  if (!subjects || subjects.length === 0) throw new Error("No subjects.");

  const today = parseDate(startDate);

  const lastExam = subjects.reduce((max, s) => {
    const d = parseDate(s.examDate);
    return d > max ? d : max;
  }, today);

  const totalDays = daysBetween(today, lastExam) + 1;
  const dailyMinutes = Math.round(dailyHours * 60);

  // Assign colors, track total days per subject, and attach custom topics if any
  const coloredSubjects = assignColors(
    subjects.map((s) => ({
      ...s,
      _totalDays: daysBetween(today, parseDate(s.examDate)),
      customTopics: s.customTopics || [],
    }))
  );

  // Build topic queues per subject: custom topics have highest priority
  const topicQueues = {};
  const topicIndices = {};
  coloredSubjects.forEach((s) => {
    const custom = s.customTopics || [];
    const bank = getTopicBank(s.name);
    // Remove duplicates from bank that already exist in custom
    const filteredBank = bank.filter(b => !custom.some(c => c.toLowerCase() === b.toLowerCase()));
    topicQueues[s.name] = [...custom, ...filteredBank];
    topicIndices[s.name] = 0;
  });

  function nextTopic(subjectName, sessionType) {
    if (sessionType === "review") return "Comprehensive topic review";
    if (sessionType === "mock_exam") return "Full mock exam conditions";
    if (sessionType === "rest") return "—";
    const q = topicQueues[subjectName];
    if (!q || q.length === 0) return "Review & consolidate";
    const idx = topicIndices[subjectName] % q.length;
    topicIndices[subjectName]++;
    return q[idx];
  }

  const studyTimeLog = {};
  coloredSubjects.forEach((s) => (studyTimeLog[s.name] = 0));

  const firstStudyDate = {};
  const reviewDatesSet = {};
  coloredSubjects.forEach((s) => {
    reviewDatesSet[s.name] = new Set();
  });

  const studyDays = [];

  for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
    const date = addDays(today, dayOffset);
    const dateStr = formatDate(date);

    const examToday = coloredSubjects.find(
      (s) => s.examDate === dateStr
    );

    const activeSubjects = coloredSubjects.filter(
      (s) => parseDate(s.examDate) >= date
    );

    const sessions = [];

    if (examToday) {
      sessions.push({
        subject: examToday.name,
        topic: `${examToday.name} Exam`,
        duration: 0,
        type: "mock_exam",
        notes: "Focus, stay calm, read questions carefully before answering.",
      });

      studyDays.push({
        date: dateStr,
        dayLabel: dayLabel(date),
        sessions,
        totalMinutes: 0,
        isExamDay: true,
        examSubject: examToday.name,
      });
      continue;
    }

    const examTomorrow = coloredSubjects.find(
      (s) => s.examDate === formatDate(addDays(date, 1))
    );
    if (examTomorrow) {
      sessions.push({
        subject: examTomorrow.name,
        topic: "Light revision — key formulas and definitions only",
        duration: Math.min(30, dailyMinutes),
        type: "review",
        notes: "No heavy study. Rest well, prepare your materials.",
      });
      studyDays.push({
        date: dateStr,
        dayLabel: dayLabel(date),
        sessions,
        totalMinutes: sessions[0].duration,
        isExamDay: false,
        examSubject: null,
      });
      continue;
    }

    const examIn2 = coloredSubjects.find(
      (s) => s.examDate === formatDate(addDays(date, 2))
    );
    if (examIn2) {
      sessions.push({
        subject: examIn2.name,
        topic: "Full topic review + past paper walkthrough",
        duration: Math.min(60, dailyMinutes),
        type: "review",
        notes: "Cover all major topics briefly. Identify any last gaps.",
      });
      studyDays.push({
        date: dateStr,
        dayLabel: dayLabel(date),
        sessions,
        totalMinutes: sessions[0].duration,
        isExamDay: false,
        examSubject: null,
      });
      continue;
    }

    if (activeSubjects.length === 0) {
      studyDays.push({
        date: dateStr,
        dayLabel: dayLabel(date),
        sessions: [],
        totalMinutes: 0,
        isExamDay: false,
        examSubject: null,
      });
      continue;
    }

    const isSunday = date.getDay() === 0;
    const anyExamSoon = activeSubjects.some(
      (s) => daysBetween(date, parseDate(s.examDate)) <= 5
    );
    if (isSunday && !anyExamSoon) {
      studyDays.push({
        date: dateStr,
        dayLabel: dayLabel(date),
        sessions: [
          {
            subject: "—",
            topic: "Rest day",
            duration: 0,
            type: "rest",
            notes: "Recharge. Good rest improves memory consolidation.",
          },
        ],
        totalMinutes: 0,
        isExamDay: false,
        examSubject: null,
      });
      continue;
    }

    const scores = activeSubjects.map((s) => ({
      subject: s,
      score: priorityScore(s, date),
    }));
    const totalScore = scores.reduce((a, b) => a + b.score, 0);

    let minutesLeft = dailyMinutes;
    const SESSION_MAX = studyStyle === "topic_blocks" ? dailyMinutes : 90;
    const SESSION_MIN = 25;

    for (const { subject: s, score } of scores) {
      if (minutesLeft < SESSION_MIN) break;
      const examDate = parseDate(s.examDate);
      const daysToExam = daysBetween(date, examDate);

      let allocated = Math.round((score / totalScore) * dailyMinutes);
      allocated = Math.max(SESSION_MIN, Math.min(allocated, minutesLeft));

      let sessionType = "study";
      if (reviewDatesSet[s.name].has(dateStr)) {
        sessionType = "review";
      } else if (daysToExam <= 7 && topicIndices[s.name] > 5) {
        sessionType = "practice";
      } else if (daysToExam <= 14 && topicIndices[s.name] > 7) {
        sessionType = "mock_exam";
      }

      let remaining = allocated;
      while (remaining >= SESSION_MIN) {
        const dur = Math.min(remaining, SESSION_MAX);
        const topic = nextTopic(s.name, sessionType);

        let notes = "";
        if (sessionType === "review") {
          notes = "Spaced repetition session — recall before re-reading.";
        } else if (sessionType === "practice") {
          notes = `${daysToExam} days to exam. Focus on past paper style questions.`;
        } else if (sessionType === "mock_exam") {
          notes = "Simulate exam conditions — no notes, timed.";
        } else {
          notes = getNoteForTopic(topic, daysToExam);
        }

        sessions.push({
          subject: s.name,
          topic,
          duration: dur,
          type: sessionType,
          notes,
        });
        remaining -= dur;
        minutesLeft -= dur;
      }

      studyTimeLog[s.name] += allocated;

      if (!firstStudyDate[s.name] && sessionType === "study") {
        firstStudyDate[s.name] = dateStr;
        const availableDays = daysToExam;
        const offsets = reviewOffsets(availableDays);
        offsets.forEach((offset) => {
          const reviewDate = formatDate(addDays(date, offset));
          if (reviewDate < s.examDate) {
            reviewDatesSet[s.name].add(reviewDate);
          }
        });
      }
    }

    const totalMinutes = sessions.reduce((a, b) => a + b.duration, 0);
    studyDays.push({
      date: dateStr,
      dayLabel: dayLabel(date),
      sessions,
      totalMinutes,
      isExamDay: false,
      examSubject: null,
    });
  }

  const subjectBreakdown = coloredSubjects.map((s) => ({
    subject: s.name,
    totalHours: +(studyTimeLog[s.name] / 60).toFixed(1),
    color: s.color,
  }));

  const totalStudyHours = Object.values(studyTimeLog).reduce((a, b) => a + b, 0) / 60;

  const summary = buildSummary(coloredSubjects, totalStudyHours, studyStyle, studyDays.length);
  const tips = buildTips(coloredSubjects, studyStyle, dailyHours);

  return {
    summary,
    totalDays,
    studyDays,
    tips,
    subjectBreakdown,
  };
}

function getNoteForTopic(topic, daysToExam) {
  const notes = [
    "Write key points in your own words as you study.",
    "Use active recall — test yourself after reading.",
    "Make a quick mind map of what you covered.",
    "Connect this topic to concepts you already know.",
    "Summarise in 3 bullet points when done.",
    "Highlight gaps you'll revisit tomorrow.",
  ];
  const urgencyNotes = [
    `${daysToExam} days left — prioritise understanding over memorisation.`,
    "Focus on commonly tested areas.",
    "Practice with past paper style questions after studying.",
  ];
  if (daysToExam <= 10) return urgencyNotes[daysToExam % urgencyNotes.length];
  return notes[Math.floor(Math.random() * notes.length)];
}

function buildSummary(subjects, totalHours, style, days) {
  const subNames = subjects.map((s) => s.name).join(", ");
  const styleDesc = {
    balanced: "evenly distributed across all subjects",
    spaced_repetition: "structured around spaced repetition intervals",
    exam_focused: "intensified near each exam date",
    topic_blocks: "organised in full-day subject blocks",
  }[style] || "intelligently distributed";

  return `${days}-day plan covering ${subNames} — ${Math.round(totalHours)} total study hours ${styleDesc}.`;
}

function buildTips(subjects, studyStyle, dailyHours) {
  const tips = [
    `Study in ${dailyHours <= 3 ? "25-minute Pomodoro" : "45-90 minute"} blocks with short breaks.`,
    "Review sessions use spaced repetition — always recall before looking at notes.",
    "On practice days, simulate exam conditions: no notes, timed, quiet.",
    "The day before each exam is a light revision day — don't cram new material.",
    `Track your weakest topics from ${subjects[0]?.name || "each subject"} and revisit them.`,
    "Sleep is critical for memory consolidation — don't sacrifice rest for extra hours.",
  ];
  if (studyStyle === "spaced_repetition") {
    tips.push("Spaced repetition review days are pre-scheduled — trust the system.");
  }
  if (subjects.length > 3) {
    tips.push("With many subjects, start each session by reviewing yesterday's notes.");
  }
  return tips.slice(0, 5);
}
