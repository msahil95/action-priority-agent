import { useState, useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Zap, CalendarClock, Users, Trash2, Calendar, KeyRound, Mic, Square, GripVertical, Pencil, Check, Mail, ExternalLink, Plus, Moon, Sun, User, ClipboardList, Keyboard, Clock } from "lucide-react";

const QUADRANTS = {
  do_now: { title: "DO IT NOW", sub: "Important + Urgent", icon: Zap, color: "#D64545", tint: "#FCEEEE", darkTint: "#2A1B1B", metaLabel: "Deadline" },
  schedule: { title: "SCHEDULE", sub: "Important + Not Urgent", icon: CalendarClock, color: "#1F8A70", tint: "#E9F5F1", darkTint: "#132420", metaLabel: "When" },
  delegate: { title: "DELEGATE", sub: "Not Important + Urgent", icon: Users, color: "#C7791F", tint: "#FBF1E4", darkTint: "#2A2114", metaLabel: "To whom" },
  delete: { title: "DELETE", sub: "Not Important + Not Urgent", icon: Trash2, color: "#6B4FA0", tint: "#F1EDF8", darkTint: "#221A2E", metaLabel: "Why" },
};
const ORDER = ["do_now", "schedule", "delegate", "delete"];

const CATEGORIES = ["Marketing", "Sales", "Finance", "Legal", "Engineering", "Operations", "Personal", "Other"];
const CAT_COLOR = {
  Marketing: "#D64BA0", Sales: "#3B82C4", Finance: "#1F8A70", Legal: "#6B4FA0",
  Engineering: "#2563A8", Operations: "#C7791F", Personal: "#5C6470", Other: "#8A8F98",
};

const PRIORITIES = ["High", "Medium", "Low"];
const PRIORITY_COLOR = { High: "#D64545", Medium: "#C7791F", Low: "#5C6470" };

const PROVIDERS = [
  { id: "gemini", label: "Google Gemini (free)", placeholder: "Paste your free Gemini API key", link: "https://aistudio.google.com/apikey" },
  { id: "anthropic", label: "Anthropic Claude (paid key)", placeholder: "Paste your Anthropic API key", link: "https://console.anthropic.com/settings/keys" },
  { id: "openai", label: "OpenAI GPT (paid key)", placeholder: "Paste your OpenAI API key", link: "https://platform.openai.com/api-keys" },
];

const DEFAULT_CAPS = { gemini: 1500, anthropic: 100, openai: 100 };
const CAP_IS_REAL = { gemini: true, anthropic: false, openai: false }; // gemini's is a real free-tier limit; others are self-set budgets

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
function loadUsage(providerId) {
  try {
    const { date, count } = JSON.parse(localStorage.getItem(`usage_${providerId}`) || "{}");
    return date === todayKey() ? count || 0 : 0;
  } catch {
    return 0;
  }
}
function bumpUsage(providerId) {
  const count = loadUsage(providerId) + 1;
  localStorage.setItem(`usage_${providerId}`, JSON.stringify({ date: todayKey(), count }));
  return count;
}
function loadCap(providerId) {
  const saved = localStorage.getItem(`cap_${providerId}`);
  return saved ? parseInt(saved, 10) : DEFAULT_CAPS[providerId];
}

let uid = 1;

function kbdStyle(theme) {
  return {
    display: "inline-block",
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 5,
    border: `1px solid ${theme.border}`,
    borderBottom: `2px solid ${theme.border}`,
    background: theme.card,
    color: theme.text,
    boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
  };
}

// Converts a Date/ISO string into the "YYYY-MM-DDTHH:mm" format <input type="datetime-local"> needs
function toLocalInputValue(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultScheduleTime() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
}

export default function Home() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      showToast("Google connection expired — please sign in again");
      signIn("google");
    }
  }, [session]);
  const [apiKey, setApiKey] = useState("");
  const [draftKey, setDraftKey] = useState("");
  const [provider, setProvider] = useState("gemini");
  const [usageCount, setUsageCount] = useState(0);
  const [usageCap, setUsageCap] = useState(DEFAULT_CAPS.gemini);
  const [realUsage, setRealUsage] = useState(null); // { limit, remaining, resetAt/resetIn } straight from the provider, when it gives one
  const [rawInput, setRawInput] = useState("");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [routingProgress, setRoutingProgress] = useState(0);
  const progressTimer = useRef(null);
  const [status, setStatus] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const cooldownTick = useRef(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [assignedToMe, setAssignedToMe] = useState([]);
  const [sentByMe, setSentByMe] = useState([]);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  function showToast(msg) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  }

  async function sendFeedback(rating) {
    setShowFeedback(false);
    setFeedbackGiven(true);
    showToast(rating === "up" ? "Thanks! 🙌" : "Thanks — noted.");
    try {
      await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
    } catch {}
  }
  const [listening, setListening] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [drag, setDrag] = useState(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [isDesktop, setIsDesktop] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const [extraConnectors, setExtraConnectors] = useState([]);
  const [dark, setDark] = useState(false);

  // The app's content box is centered with margins on wide screens — those
  // margins are the actual page background, separate from the box itself.
  // Without this, dark mode only colored the box, leaving white strips on
  // either side on desktop.
  useEffect(() => {
    document.body.style.background = dark ? "#14161B" : "#F5F7F6";
    document.documentElement.style.background = dark ? "#14161B" : "#F5F7F6";
  }, [dark]);

  const recognitionRef = useRef(null);
  const listeningRef = useRef(false);
  const baseTextRef = useRef("");
  const cardStartRef = useRef({ x: 0, y: 0 });
  const saveTimer = useRef(null);
  const loadedForUser = useRef(null);

  // Load this user's saved tasks once, right after they sign in
  useEffect(() => {
    if (!session || loadedForUser.current === session.user.email) return;
    loadedForUser.current = session.user.email;
    fetch("/api/tasks/load")
      .then((r) => r.json())
      .then((data) => {
        if (data.tasks && data.tasks.length) {
          const maxId = Math.max(0, ...data.tasks.map((t) => t.id || 0));
          uid = maxId + 1;
          setTasks(data.tasks);
        }
      })
      .catch(() => {});
    refreshAssignments();
  }, [session]);

  // Poll for new assignments every 30s while the app is open — not true push,
  // but new "assigned to you" items show up without needing a manual refresh
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(refreshAssignments, 30000);
    return () => clearInterval(interval);
  }, [session]);

  function refreshAssignments() {
    fetch("/api/assign/list")
      .then((r) => r.json())
      .then((data) => setAssignedToMe(data.assignments || []))
      .catch(() => {});
    fetch("/api/assign/sent")
      .then((r) => r.json())
      .then((data) => setSentByMe(data.assignments || []))
      .catch(() => {});
  }

  // Pulls an incoming assignment into your own board as a real task —
  // lands in Do It Now by default since it's a fresh incoming request,
  // but you can drag it to Schedule/wherever fits once you've seen it.
  function addAssignmentToBoard(a) {
    setTasks((prev) => [
      ...prev,
      {
        id: uid++,
        text: a.task_text,
        quadrant: "do_now",
        reason: `Delegated by ${a.from_email}`,
        meta: "",
        category: "Other",
        priority: "Medium",
        whenISO: null,
        eventId: null,
        done: false,
      },
    ]);
    fetch("/api/assign/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id }),
    }).catch(() => {});
    setAssignedToMe((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: "done" } : x)));
    showToast("Added to your board");
  }

  async function sendReply(id) {
    const reply = (replyDrafts[id] || "").trim();
    if (!reply) return;
    setAssignedToMe((prev) => prev.map((a) => (a.id === id ? { ...a, reply } : a)));
    setReplyDrafts((prev) => ({ ...prev, [id]: "" }));
    showToast("Reply sent");
    await fetch("/api/assign/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, reply }),
    }).catch(() => {});
  }

  async function completeAssignedTask(id) {
    setAssignedToMe((prev) => prev.map((a) => (a.id === id ? { ...a, status: "done" } : a)));
    await fetch("/api/assign/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  // Auto-save, debounced, whenever the task list changes and someone's signed in
  useEffect(() => {
    if (!session) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/tasks/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks }),
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(saveTimer.current);
  }, [tasks, session]);

  useEffect(() => {
    const savedProvider = localStorage.getItem("llm_provider") || "gemini";
    setProvider(savedProvider);
    const saved = localStorage.getItem(`api_key_${savedProvider}`);
    if (saved) {
      setApiKey(saved);
      setDraftKey(saved);
    }
    setUsageCount(loadUsage(savedProvider));
    setUsageCap(loadCap(savedProvider));
    setVoiceSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
    const check = () => setIsDesktop(window.innerWidth >= 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  function submitKey() {
    setApiKey(draftKey);
    localStorage.setItem(`api_key_${provider}`, draftKey);
    showToast(draftKey ? "✓ API key saved" : "Key cleared");
  }

  function switchProvider(id) {
    setProvider(id);
    localStorage.setItem("llm_provider", id);
    const saved = localStorage.getItem(`api_key_${id}`) || "";
    setApiKey(saved);
    setDraftKey(saved);
    setUsageCount(loadUsage(id));
    setUsageCap(loadCap(id));
    setRealUsage(null);
  }

  function editCap() {
    const val = window.prompt(
      `Set your personal daily budget for ${PROVIDERS.find((p) => p.id === provider).label}:`,
      usageCap
    );
    const num = parseInt(val, 10);
    if (!num || num <= 0) return;
    localStorage.setItem(`cap_${provider}`, String(num));
    setUsageCap(num);
  }

  function addCustomConnector() {
    const name = window.prompt("Connector name (e.g. Notion, Slack):");
    if (!name || !name.trim()) return;
    setExtraConnectors((p) => [...p, name.trim()]);
  }

  function startRecognitionSession() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = false; // Android's continuous mode replays old final results — false + auto-restart avoids it
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let final = "", interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t + " ";
        else interim += t;
      }
      if (final) baseTextRef.current = (baseTextRef.current + final).trim() + " ";
      setRawInput((baseTextRef.current + interim).trim());
      setLiveText(interim || final.trim());
    };
    recognition.onerror = (e) => {
      if (e.error !== "no-speech") {
        listeningRef.current = false;
        setListening(false);
      }
    };
    recognition.onend = () => {
      if (listeningRef.current) {
        startRecognitionSession(); // keep listening across pauses, each session starts clean
      } else {
        setLiveText("");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function toggleListening() {
    if (!voiceSupported) return;
    if (listening) {
      listeningRef.current = false;
      recognitionRef.current && recognitionRef.current.stop();
      setListening(false);
      setLiveText("");
      return;
    }
    baseTextRef.current = rawInput ? rawInput.replace(/\n$/, "") + " " : "";
    listeningRef.current = true;
    setListening(true);
    startRecognitionSession();
  }

  // Tap Control alone to toggle dictation on laptops — press once to start, again to stop.
  // Tracks whether another key was pressed while Control was held, so normal
  // shortcuts like Ctrl+C or Ctrl+S don't accidentally toggle the mic.
  const toggleListeningRef = useRef(() => {});
  useEffect(() => {
    toggleListeningRef.current = toggleListening;
  });
  const ctrlOnlyRef = useRef(true);
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Control") {
        ctrlOnlyRef.current = true;
      } else if (e.ctrlKey) {
        ctrlOnlyRef.current = false;
      }
    }
    function handleKeyUp(e) {
      if (e.key === "Control" && ctrlOnlyRef.current) {
        toggleListeningRef.current();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Tap Alt (Windows) / Option (Mac) alone to run Smart Routing — same key,
  // different name per OS. Tracks whether another key was pressed while held,
  // so normal Option-combo typing (accented characters etc.) isn't disrupted.
  const runTriageRef = useRef(() => {});
  useEffect(() => {
    runTriageRef.current = runTriage;
  });
  const altOnlyRef = useRef(true);
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Alt") {
        altOnlyRef.current = true;
      } else if (e.altKey) {
        altOnlyRef.current = false;
      }
    }
    function handleKeyUp(e) {
      if (e.key === "Alt" && altOnlyRef.current) {
        e.preventDefault();
        runTriageRef.current();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Counts down a short-term rate-limit cooldown, once one is detected
  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownTick.current = setInterval(() => {
      setCooldown((c) => (c > 1 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(cooldownTick.current);
  }, [cooldown > 0]);

  function startCooldownFromError(message) {
    const match = message.match(/retry in ([\d.]+)\s*s/i);
    const seconds = match ? Math.ceil(parseFloat(match[1])) : 20;
    const isRateLimit = /rate limit|quota exceeded|429|too many requests/i.test(message);
    if (isRateLimit) setCooldown(seconds);
  }

  async function runTriage() {
    if (listening) {
      recognitionRef.current && recognitionRef.current.stop();
      setListening(false);
      setLiveText("");
    }
    if (!apiKey) return setStatus(`Add your ${PROVIDERS.find((p) => p.id === provider).label.split(" (")[0]} API key first.`);
    const text = rawInput.trim();
    if (!text) return setStatus("Add or dictate at least one task.");
    setLoading(true);
    setStatus("");
    setRoutingProgress(3);
    // Climbs quickly at first, then slows as it approaches 90% — never claims
    // 100% until the real response actually arrives, since there's no true
    // step-by-step progress to report from a single AI call.
    progressTimer.current = setInterval(() => {
      setRoutingProgress((p) => (p < 90 ? p + Math.max(1, (90 - p) * 0.12) : p));
    }, 150);
    try {
      const now = new Date();
      const systemInstruction = `Current date and time: ${now.toString()}. You'll get raw text — often a spoken, run-on paragraph mixing several unrelated tasks with no clear breaks (e.g. "post the campaign, also fix that login bug, and I need to hand off the invoice to Priya"). First, split it into distinct, individual actionable tasks, each as a clean short sentence in the user's own words. Then, for each task, apply the Eisenhower Matrix — quadrant is one of do_now/schedule/delegate/delete — pick a department category from exactly this list: ${CATEGORIES.join(", ")} — and pick a priority from exactly this list: ${PRIORITIES.join(", ")} (how much this matters, independent of urgency). If the task mentions or implies a specific time (e.g. "at 5am", "tomorrow", "tonight", "next Monday at 3pm"), compute the actual date/time relative to the current date/time given above and put it as a precise ISO 8601 datetime string (e.g. "2026-08-20T05:00:00") in a field called when_iso. If no specific time is mentioned, set when_iso to null. Also include a short reason and a meta field (a short human-readable version of the deadline/schedule time/delegate name, or null). Respond ONLY with JSON, no commentary: {"tasks":[{"text":"...","quadrant":"do_now","category":"Marketing","priority":"High","reason":"...","meta":"...","when_iso":"..."}]}`;

      const res = await fetch("/api/llm/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, systemInstruction, text }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.usage) setRealUsage(data.usage);
      else setUsageCount(bumpUsage(provider));
      const parsed = JSON.parse(data.raw.replace(/```json|```/g, "").trim());
      const newTasks = parsed.tasks.map((m) => ({
        id: uid++,
        text: m.text,
        quadrant: QUADRANTS[m.quadrant] ? m.quadrant : "delete",
        reason: m.reason || "",
        meta: m.meta && m.meta !== "null" ? m.meta : "",
        category: CATEGORIES.includes(m.category) ? m.category : "Other",
        priority: PRIORITIES.includes(m.priority) ? m.priority : "Medium",
        whenISO: m.when_iso && m.when_iso !== "null" ? m.when_iso : null,
        eventId: null,
        done: false,
      }));
      setTasks((p) => [...p, ...newTasks]);
      if (!feedbackGiven) setShowFeedback(true);
      setRawInput("");
    } catch (e) {
      setStatus("Triage failed: " + e.message);
      startCooldownFromError(e.message);
    } finally {
      clearInterval(progressTimer.current);
      setRoutingProgress(100);
      setTimeout(() => setRoutingProgress(0), 400);
      setLoading(false);
    }
  }

  async function pushToCalendar(task) {
    if (!session) return showToast("Sign in with Google first.");
    showToast("Adding to calendar…");
    const start = task.whenISO ? new Date(task.whenISO) : defaultScheduleTime();
    const end = new Date(start.getTime() + 30 * 60000);
    const res = await fetch("/api/calendar/create-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: task.text, notes: task.reason, startISO: start.toISOString(), endISO: end.toISOString() }),
    });
    const data = await res.json();
    if (res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, eventId: data.eventId } : t)));
    }
    showToast(res.ok ? "✓ Added to your calendar" : "Failed: " + data.error);
  }

  async function cancelCalendarEvent(task) {
    if (!task.eventId || !session) return;
    await fetch("/api/calendar/delete-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: task.eventId }),
    });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, eventId: null } : t)));
  }

  function editTaskText(id, text) { setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, text } : t))); }
  function cycleCategory(id) {
    setTasks((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      const idx = CATEGORIES.indexOf(t.category);
      return { ...t, category: CATEGORIES[(idx + 1) % CATEGORIES.length] };
    }));
  }
  function cyclePriority(id) {
    setTasks((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      const idx = PRIORITIES.indexOf(t.priority);
      return { ...t, priority: PRIORITIES[(idx + 1) % PRIORITIES.length] };
    }));
  }
  function toggleDone(id) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    const t = tasks.find((x) => x.id === id);
    if (t && !t.done && t.eventId) cancelCalendarEvent(t);
  }
  function deleteTaskPermanently(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }
  function setWhenISO(id, iso) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, whenISO: iso } : t)));
  }

  function moveTask(id, quadrant) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, quadrant } : t)));
    const t = tasks.find((x) => x.id === id);
    if (t && quadrant === "delete" && t.eventId) cancelCalendarEvent(t);
  }

  function setContact(id, contact) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, contact } : t)));
  }

  async function sendDelegateEmail(task) {
    if (!session) return showToast("Sign in with Google first.");
    if (!task.contact || !task.contact.includes("@")) return showToast("Add a valid email above first.");
    showToast("Sending…");
    const res = await fetch("/api/gmail/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: task.contact,
        subject: `Task: ${task.text}`,
        body: `Hi,\n\nCould you take care of this?\n\n"${task.text}"\n\n${task.reason || ""}\n\nThanks!`,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      await fetch("/api/assign/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail: task.contact, taskText: task.text, reason: task.reason }),
      }).catch(() => {});
    }
    showToast(res.ok ? "✓ Sent — they'll see it if they sign in here too" : "Failed: " + data.error);
  }

  function sendDelegateWhatsApp(task) {
    if (!task.contact || task.contact.includes("@")) return showToast("Add a phone number above first (with country code, no spaces).");
    const phone = task.contact.replace(/[^0-9]/g, "");
    const text = encodeURIComponent(`Hey! Could you take care of this: "${task.text}"`);
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  }

  function onCardPointerDown(e, task) {
    if (editingId === task.id) return;
    if (e.target.closest("button, input, select, a")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    cardStartRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ id: task.id, x: e.clientX, y: e.clientY, dx: 0, dy: 0 });
  }
  function onCardPointerMove(e) {
    if (!drag) return;
    setDrag((d) => (d ? { ...d, dx: e.clientX - cardStartRef.current.x, dy: e.clientY - cardStartRef.current.y, x: e.clientX, y: e.clientY } : d));
  }
  function onCardPointerUp() {
    if (!drag) return;
    const el = document.elementFromPoint(drag.x, drag.y);
    const zone = el && el.closest("[data-quadrant]");
    if (zone) moveTask(drag.id, zone.getAttribute("data-quadrant"));
    setDrag(null);
  }

  const visibleTasks = activeCategory === "All" ? tasks : tasks.filter((t) => t.category === activeCategory);
  const usedCategories = ["All", ...CATEGORIES.filter((c) => tasks.some((t) => t.category === c))];

  const theme = dark
    ? { bg: "#14161B", card: "#1E2128", border: "#2A2E37", text: "#F2F3F5", subtext: "#8B92A0", inputBg: "#14161B" }
    : { bg: "#F5F7F6", card: "#FFFFFF", border: "#E1E4E1", text: "#1C1F26", subtext: "#5C6470", inputBg: "#FFFFFF" };

  return (
    <div
      onPointerMove={onCardPointerMove}
      onPointerUp={onCardPointerUp}
      style={{ maxWidth: isDesktop ? 920 : 480, margin: "0 auto", padding: "16px 14px 40px", fontFamily: "Inter, sans-serif", background: theme.bg, minHeight: "100vh", boxSizing: "border-box", color: theme.text, transition: "background 0.2s ease, color 0.2s ease" }}
    >
      <div style={{ position: "sticky", top: 0, background: theme.bg, paddingBottom: 10, zIndex: 5 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #6366F1, #8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Zap size={17} color="#fff" fill="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Action &amp; Priority Agent</h1>
              <div style={{ fontSize: 11, color: theme.subtext }}>Your AI-powered productivity co-pilot</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setShowSetup((s) => !s)} style={{ fontSize: 11, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, borderRadius: 20, padding: "6px 12px" }}>
              {showSetup ? "Hide Setup" : "Setup"}
            </button>
            <button onClick={() => setDark((d) => !d)} style={{ width: 30, height: 30, borderRadius: "50%", border: `1px solid ${theme.border}`, background: theme.card, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {dark ? <Sun size={14} color={theme.text} /> : <Moon size={14} color={theme.text} />}
            </button>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: theme.border, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}>
              <User size={15} color={theme.subtext} />
              <span style={{ position: "absolute", bottom: -1, right: -1, width: 9, height: 9, borderRadius: "50%", background: "#22C55E", border: `2px solid ${theme.bg}` }} />
            </div>
          </div>
        </div>
      </div>

      {showSetup && (
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#8B5CF6", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Connect your tools — one time
          </div>

          {/* Google: Calendar + Gmail via one sign-in */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${theme.border}` }}>
            <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: dark ? "#2A2E37" : "#F5F7F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Calendar size={14} color="#4285F4" />
              </div>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: dark ? "#2A2E37" : "#F5F7F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Mail size={14} color="#EA4335" />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Google Calendar &amp; Gmail</div>
              <div style={{ fontSize: 11, color: theme.subtext }}>{session ? `Connected as ${session.user.email}` : "Push tasks to your calendar, delegate by email"}</div>
            </div>
            {session ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#22C55E", background: "#22C55E1A", borderRadius: 20, padding: "4px 10px" }}>Connected</span>
                <button onClick={() => signOut()} style={{ fontSize: 11, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, borderRadius: 20, padding: "5px 10px" }}>Manage</button>
              </div>
            ) : (
              <button onClick={() => signIn("google")} style={{ fontSize: 11, border: "none", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "#fff", borderRadius: 20, padding: "6px 12px", flexShrink: 0 }}>Sign in</button>
            )}
          </div>

          {/* LLM provider */}
          <div style={{ padding: "10px 0", borderBottom: `1px solid ${theme.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: apiKey ? "#22C55E1A" : (dark ? "#2A2E37" : "#F5F7F6"), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <KeyRound size={15} color={apiKey ? "#22C55E" : theme.subtext} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <select
                  value={provider}
                  onChange={(e) => switchProvider(e.target.value)}
                  style={{ fontSize: 13, fontWeight: 600, border: "none", background: "transparent", padding: 0, marginBottom: 4, width: "100%", color: theme.text }}
                >
                  {PROVIDERS.map((p) => <option key={p.id} value={p.id} style={{ color: "#000" }}>{p.label}</option>)}
                </select>
                <input
                  type="password"
                  placeholder={PROVIDERS.find((p) => p.id === provider).placeholder}
                  value={draftKey}
                  onChange={(e) => setDraftKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitKey()}
                  style={{ width: "100%", border: `1px solid ${theme.border}`, borderRadius: 8, padding: "6px 8px", fontSize: 12, boxSizing: "border-box", background: theme.inputBg, color: theme.text }}
                />
              </div>
              <button
                onClick={submitKey}
                disabled={draftKey === apiKey}
                style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, border: "none", borderRadius: 20, padding: "6px 12px", color: "#fff", background: draftKey === apiKey ? "#B9BEC6" : "linear-gradient(135deg, #6366F1, #8B5CF6)", cursor: draftKey === apiKey ? "default" : "pointer" }}
              >
                Save
              </button>
              <a href={PROVIDERS.find((p) => p.id === provider).link} target="_blank" rel="noreferrer" style={{ flexShrink: 0, fontSize: 11, display: "flex", alignItems: "center", gap: 4, border: `1px solid ${theme.border}`, borderRadius: 20, padding: "6px 10px", color: theme.text, textDecoration: "none" }}>
                Get Key <ExternalLink size={11} />
              </a>
            </div>

            {/* Usage battery */}
            {(() => {
              const usingReal = !!realUsage;
              const limit = usingReal ? realUsage.limit : usageCap;
              const remaining = usingReal ? realUsage.remaining : Math.max(0, usageCap - usageCount);
              const pct = Math.max(0, Math.min(100, Math.round((remaining / limit) * 100)));
              let color = "#22C55E", label = "Full";
              if (pct < 15) { color = "#EF4444"; label = "Critical"; }
              else if (pct < 25) { color = "#F97316"; label = "Low"; }
              else if (pct < 50) { color = "#EAB308"; label = "Moderate"; }
              else if (pct < 75) { color = "#22C55E"; label = "Good"; }
              const segments = 4;
              const filled = Math.round((pct / 100) * segments);

              let rechargeText = "";
              if (usingReal) {
                if (realUsage.resetAt) {
                  const d = new Date(realUsage.resetAt);
                  rechargeText = `recharges ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
                } else if (realUsage.resetIn) {
                  rechargeText = `recharges in ${realUsage.resetIn}`;
                }
              } else {
                rechargeText = "recharges at midnight";
              }

              return (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, paddingLeft: 40, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 2, border: `2px solid ${theme.subtext}`, borderRadius: 4, padding: 2 }}>
                    {[...Array(segments)].map((_, i) => (
                      <div key={i} style={{ width: 7, height: 12, borderRadius: 1, background: i < filled ? color : (dark ? "#2A2E37" : "#E5E7EB") }} />
                    ))}
                    <div style={{ width: 2, height: 6, background: theme.subtext, borderRadius: 1 }} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color }}>{pct}% {label}</div>
                  <div style={{ fontSize: 10, color: theme.subtext }}>
                    {usingReal ? `${remaining.toLocaleString()} tokens left` : `${usageCount}/${usageCap} used today`}
                    {rechargeText ? ` · ${rechargeText}` : ""}
                    {!usingReal && !CAP_IS_REAL[provider] && (
                      <>
                        {" · "}
                        <button onClick={editCap} style={{ border: "none", background: "none", textDecoration: "underline", color: theme.subtext, fontSize: 10, cursor: "pointer", padding: 0 }}>edit budget</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Extra connectors */}
          {extraConnectors.map((name) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${theme.border}` }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "#FBF1E4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Mail size={15} color="#C7791F" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                <div style={{ fontSize: 11, color: theme.subtext }}>Saved — not wired up yet</div>
              </div>
            </div>
          ))}

          <button onClick={addCustomConnector} style={{ marginTop: 10, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: `1px dashed ${theme.border}`, background: "transparent", borderRadius: 10, padding: "8px", fontSize: 12, color: theme.subtext }}>
            <Plus size={13} /> Add another connector
          </button>
        </div>
      )}

      {session && assignedToMe.filter((a) => a.status !== "done").length > 0 && (
        <div style={{ background: "#FBF1E4", border: "1px solid #C7791F44", borderRadius: 14, padding: 12, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#C7791F", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Assigned to you
            </div>
            <button onClick={refreshAssignments} style={{ fontSize: 10.5, border: "none", background: "none", color: "#C7791F", textDecoration: "underline", cursor: "pointer" }}>
              refresh
            </button>
          </div>
          {assignedToMe.filter((a) => a.status !== "done").map((a) => (
            <div key={a.id} style={{ background: "#fff", borderRadius: 8, padding: 8, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <button
                  onClick={() => completeAssignedTask(a.id)}
                  style={{ width: 16, height: 16, borderRadius: 5, border: "1.5px solid #C7791F", background: "transparent", flexShrink: 0, marginTop: 2, padding: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{a.task_text}</div>
                  <div style={{ fontSize: 10.5, color: "#8A8F98" }}>From {a.from_email}{a.reason ? ` · ${a.reason}` : ""}</div>
                  {a.reply && <div style={{ fontSize: 11, color: "#1F8A70", marginTop: 4 }}>You replied: "{a.reply}"</div>}
                  <button
                    onClick={() => addAssignmentToBoard(a)}
                    style={{ marginTop: 5, fontSize: 10.5, fontWeight: 700, border: "1px solid #C7791F44", background: "#FBF1E4", color: "#C7791F", borderRadius: 6, padding: "2px 8px" }}
                  >
                    + Add to my board
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, marginLeft: 24 }}>
                <input
                  value={replyDrafts[a.id] || ""}
                  onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [a.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && sendReply(a.id)}
                  placeholder="Quick reply…"
                  style={{ flex: 1, fontSize: 11.5, border: "1px solid #E1E4E1", borderRadius: 6, padding: "4px 7px" }}
                />
                <button
                  onClick={() => sendReply(a.id)}
                  style={{ fontSize: 11, fontWeight: 700, border: "none", background: "#C7791F", color: "#fff", borderRadius: 6, padding: "4px 10px" }}
                >
                  Reply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {session && sentByMe.filter((a) => a.reply).length > 0 && (
        <div style={{ background: "#E9F5F1", border: "1px solid #1F8A7044", borderRadius: 14, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1F8A70", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
            Replies to what you sent
          </div>
          {sentByMe.filter((a) => a.reply).map((a) => (
            <div key={a.id} style={{ background: "#fff", borderRadius: 8, padding: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{a.task_text}</div>
              <div style={{ fontSize: 10.5, color: "#8A8F98" }}>{a.to_email} replied:</div>
              <div style={{ fontSize: 12, color: "#1F8A70", marginTop: 2 }}>"{a.reply}"</div>
            </div>
          ))}
        </div>
      )}

      {/* Dictation + input: stacked on phone, side-by-side on desktop */}
      <div style={{ display: "flex", flexDirection: isDesktop ? "row" : "column", gap: isDesktop ? 16 : 0, alignItems: isDesktop ? "flex-start" : "stretch", marginBottom: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
          <button
            onClick={toggleListening}
            disabled={!voiceSupported}
            style={{
              position: "relative",
              width: 64, height: 64, borderRadius: "50%", border: "none",
              background: listening ? "linear-gradient(135deg, #D64545, #B23636)" : "linear-gradient(135deg, #1C1F26, #33384A)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: listening ? "0 0 0 6px #D6454522" : "0 4px 14px rgba(28,31,38,0.25)",
              opacity: voiceSupported ? 1 : 0.5,
            }}
          >
            {listening && <span className="pulsering" />}
            {listening ? <Square size={20} color="#fff" fill="#fff" /> : <Mic size={22} color="#fff" />}
          </button>
          <div style={{ fontSize: 11.5, color: theme.subtext, marginTop: 8, fontWeight: 600, whiteSpace: "nowrap" }}>
            {listening ? "Listening…" : "Tap to dictate"}
          </div>
          {listening && !isDesktop && (
            <div style={{ marginTop: 8, background: "#1C1F26", color: "#fff", borderRadius: 20, padding: "8px 16px", fontSize: 12.5, maxWidth: "100%", textAlign: "center" }}>
              {liveText || "…"}
            </div>
          )}
        </div>

        <div style={{ flex: 1, width: "100%", marginTop: isDesktop ? 0 : 10 }}>
          {listening && isDesktop && (
            <div style={{ marginBottom: 8, background: "#1C1F26", color: "#fff", borderRadius: 10, padding: "9px 14px", fontSize: 13 }}>
              {liveText || "…"}
            </div>
          )}
          <textarea
            rows={isDesktop ? 4 : 3}
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="Speak or type freely — even one run-on paragraph mixing several tasks works"
            style={{ width: "100%", padding: 10, border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 13, boxSizing: "border-box", marginBottom: 8, background: theme.inputBg, color: theme.text }}
          />
          {status && <div style={{ fontSize: 12, color: "#E24B4A", marginBottom: 6 }}>{status}</div>}
          {cooldown > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#C7791F", marginBottom: 6, fontWeight: 600 }}>
              <Clock size={13} /> Free tier's short-term limit hit — try again in {cooldown}s
            </div>
          )}
          <button
            onClick={runTriage}
            disabled={loading || cooldown > 0}
            style={{
              width: isDesktop ? "auto" : "100%", minWidth: isDesktop ? 180 : undefined,
              background: cooldown > 0 ? "#C7CBCE" : loading ? "#A0A3AD" : "linear-gradient(135deg, #6366F1, #8B5CF6)",
              color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontSize: 13, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              position: "relative", overflow: "hidden", cursor: cooldown > 0 ? "not-allowed" : "pointer",
            }}
          >
            {loading && (
              <div
                style={{
                  position: "absolute", left: 0, top: 0, bottom: 0, width: `${routingProgress}%`,
                  background: "linear-gradient(135deg, #6366F1, #8B5CF6)", transition: "width 0.15s ease",
                }}
              />
            )}
            <span style={{ position: "relative", display: "flex", alignItems: "center", gap: 6, color: "#fff" }}>
              {cooldown > 0 ? (
                <><Clock size={13} /> Wait {cooldown}s</>
              ) : (
                <><Zap size={13} /> {loading ? `Routing… ${Math.round(routingProgress)}%` : "Smart Routing"}</>
              )}
            </span>
          </button>
          {showFeedback && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "8px 12px" }}>
              <span style={{ fontSize: 12, color: theme.subtext }}>How's this working for you?</span>
              <button onClick={() => sendFeedback("up")} style={{ border: "none", background: "none", fontSize: 16, cursor: "pointer" }}>👍</button>
              <button onClick={() => sendFeedback("down")} style={{ border: "none", background: "none", fontSize: 16, cursor: "pointer" }}>👎</button>
            </div>
          )}
        </div>
      </div>

      {isDesktop && (
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 16, padding: "8px 4px" }}>
          <Keyboard size={14} color={theme.subtext} style={{ flexShrink: 0 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={kbdStyle(theme)}>Control</span>
            <span style={{ fontSize: 11, color: theme.subtext }}>tap to dictate / stop</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={kbdStyle(theme)}>⌥ Option / Alt</span>
            <span style={{ fontSize: 11, color: theme.subtext }}>tap to run Smart Routing</span>
          </div>
        </div>
      )}

      {tasks.length > 0 && (
        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14, paddingBottom: 2 }}>
          {usedCategories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              style={{
                flexShrink: 0, fontSize: 11.5, fontWeight: 600, padding: "5px 11px", borderRadius: 20,
                border: `1px solid ${activeCategory === c ? "#8B5CF6" : theme.border}`,
                background: activeCategory === c ? "linear-gradient(135deg, #6366F1, #8B5CF6)" : theme.card,
                color: activeCategory === c ? "#fff" : theme.subtext,
              }}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: isDesktop ? "grid" : "block", gridTemplateColumns: isDesktop ? "1fr 1fr" : undefined, gap: isDesktop ? 14 : 0 }}>
        {ORDER.map((key) => {
          const q = QUADRANTS[key];
          const Icon = q.icon;
          const items = visibleTasks.filter((t) => t.quadrant === key && !t.done);
          return (
            <div key={key} data-quadrant={key} style={{ borderRadius: 14, overflow: "hidden", marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ background: q.color, padding: "10px 13px", display: "flex", alignItems: "center", gap: 8 }}>
                <Icon size={15} color="#fff" />
                <div>
                  <div style={{ color: "#fff", fontWeight: 800, fontSize: 13, letterSpacing: "0.02em" }}>{q.title}</div>
                  <div style={{ color: "#FFFFFFCC", fontSize: 10, fontWeight: 500 }}>{q.sub}</div>
                </div>
                <span style={{ marginLeft: "auto", color: "#fff", fontSize: 12, fontWeight: 700, background: "#FFFFFF33", borderRadius: 20, padding: "2px 9px" }}>
                  {items.length}
                </span>
              </div>

              <div style={{ background: dark ? q.darkTint : q.tint, padding: 8, minHeight: isDesktop ? 120 : undefined }}>
                {items.length === 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 6px" }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: `${q.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <ClipboardList size={14} color={q.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>No tasks yet</div>
                      <div style={{ fontSize: 10.5, color: theme.subtext }}>Add tasks above or speak to get started</div>
                    </div>
                  </div>
                )}
                {items.map((t) => {
                  const isDragging = drag && drag.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onPointerDown={(e) => onCardPointerDown(e, t)}
                      style={{
                        background: theme.card, borderRadius: 9, padding: "8px 9px", marginBottom: 6, fontSize: 13, touchAction: "none",
                        userSelect: "none", WebkitUserSelect: "none", cursor: isDragging ? "grabbing" : "grab",
                        boxShadow: isDragging ? "0 8px 18px rgba(0,0,0,0.18)" : "0 1px 2px rgba(0,0,0,0.04)",
                        transform: isDragging ? `translate(${drag.dx}px, ${drag.dy}px) scale(1.03)` : "none",
                        position: isDragging ? "relative" : "static", zIndex: isDragging ? 10 : 1,
                        opacity: t.done ? 0.55 : 1, color: theme.text,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                        <button
                          onClick={() => toggleDone(t.id)}
                          style={{
                            width: 16, height: 16, borderRadius: 5, border: `1.5px solid ${t.done ? q.color : "#C7CBCE"}`,
                            background: t.done ? q.color : "transparent", flexShrink: 0, marginTop: 2,
                            display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                          }}
                        >
                          {t.done && <Check size={11} color="#fff" />}
                        </button>
                        <GripVertical size={13} color="#B9BEC6" style={{ marginTop: 2, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {editingId === t.id ? (
                            <input
                              autoFocus value={t.text}
                              onChange={(e) => editTaskText(t.id, e.target.value)}
                              onBlur={() => setEditingId(null)}
                              onKeyDown={(e) => e.key === "Enter" && setEditingId(null)}
                              style={{ width: "100%", border: "1px solid #E1E4E1", borderRadius: 6, padding: "4px 6px", fontSize: 13 }}
                            />
                          ) : (
                            <div onClick={() => setEditingId(t.id)} style={{ display: "flex", alignItems: "center", gap: 5, textDecoration: t.done ? "line-through" : "none" }}>
                              <span>{t.text}</span>
                              <Pencil size={11} color="#B9BEC6" />
                            </div>
                          )}
                          {t.meta && <div style={{ fontSize: 10.5, color: q.color, fontWeight: 600, marginTop: 2 }}>{q.metaLabel}: {t.meta}</div>}
                          {t.reason && <div style={{ fontSize: 10.5, color: "#8A8F98", marginTop: 1 }}>{t.reason}</div>}
                          <button
                            onClick={() => cycleCategory(t.id)}
                            style={{ marginTop: 6, fontSize: 10.5, fontWeight: 700, border: "none", borderRadius: 20, padding: "2px 8px", background: `${CAT_COLOR[t.category]}1A`, color: CAT_COLOR[t.category] }}
                          >
                            ● {t.category}
                          </button>
                          {(key === "do_now" || key === "delegate") && (
                            <button
                              onClick={() => cyclePriority(t.id)}
                              style={{ marginTop: 6, marginLeft: 5, fontSize: 10.5, fontWeight: 700, border: "none", borderRadius: 20, padding: "2px 8px", background: `${PRIORITY_COLOR[t.priority]}1A`, color: PRIORITY_COLOR[t.priority] }}
                            >
                              ▲ {t.priority}
                            </button>
                          )}
                          {key === "schedule" && (
                            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                              <input
                                type="datetime-local"
                                value={toLocalInputValue(t.whenISO || defaultScheduleTime())}
                                onChange={(e) => setWhenISO(t.id, new Date(e.target.value).toISOString())}
                                style={{ fontSize: 10.5, border: "1px solid #E1E4E1", borderRadius: 6, padding: "3px 6px" }}
                              />
                              <button
                                onClick={() => pushToCalendar(t)}
                                style={{ fontSize: 10.5, display: "inline-flex", gap: 4, alignItems: "center", border: "1px solid #1F8A7044", background: "#E9F5F1", color: "#1F8A70", borderRadius: 6, padding: "3px 7px" }}
                              >
                                <Calendar size={10} /> Calendar
                              </button>
                            </div>
                          )}
                          {key === "delegate" && (
                            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                              <input
                                value={t.contact || ""}
                                onChange={(e) => setContact(t.id, e.target.value)}
                                placeholder="Their email or phone (+countrycode)"
                                style={{ fontSize: 10.5, border: "1px solid #E1E4E1", borderRadius: 6, padding: "3px 6px", width: 170 }}
                              />
                              <button
                                onClick={() => sendDelegateEmail(t)}
                                style={{ fontSize: 10.5, display: "inline-flex", gap: 4, alignItems: "center", border: "1px solid #C7791F44", background: "#FBF1E4", color: "#C7791F", borderRadius: 6, padding: "3px 7px" }}
                              >
                                <Mail size={10} /> Send
                              </button>
                              <button
                                onClick={() => sendDelegateWhatsApp(t)}
                                style={{ fontSize: 10.5, display: "inline-flex", gap: 4, alignItems: "center", border: "1px solid #25D36644", background: "#E9F9EF", color: "#128C4A", borderRadius: 6, padding: "3px 7px" }}
                              >
                                WhatsApp
                              </button>
                            </div>
                          )}
                          <div style={{ marginTop: 7, display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 9.5, color: theme.subtext }}>Move to:</span>
                            {ORDER.filter((k) => k !== key).map((k) => {
                              const target = QUADRANTS[k];
                              const TIcon = target.icon;
                              return (
                                <button
                                  key={k}
                                  onClick={() => moveTask(t.id, k)}
                                  title={target.title}
                                  style={{
                                    width: 22, height: 22, borderRadius: 6, border: `1px solid ${target.color}44`,
                                    background: `${target.color}1A`, display: "flex", alignItems: "center", justifyContent: "center",
                                    cursor: "pointer", padding: 0,
                                  }}
                                >
                                  <TIcon size={11} color={target.color} />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {tasks.some((t) => t.done) && (
        <div style={{ marginTop: 4 }}>
          <button
            onClick={() => setShowCompleted((s) => !s)}
            style={{ display: "flex", alignItems: "center", gap: 6, border: "none", background: "none", fontSize: 12, fontWeight: 700, color: theme.subtext, cursor: "pointer", padding: "6px 2px" }}
          >
            <Check size={13} /> Completed ({tasks.filter((t) => t.done).length}) {showCompleted ? "▲" : "▼"}
          </button>
          {showCompleted && (
            <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 10 }}>
              {tasks.filter((t) => t.done).map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ flex: 1, fontSize: 12.5, color: theme.subtext, textDecoration: "line-through" }}>{t.text}</div>
                  <button onClick={() => toggleDone(t.id)} title="Restore" style={{ fontSize: 10.5, border: `1px solid ${theme.border}`, background: "transparent", color: theme.text, borderRadius: 6, padding: "3px 7px" }}>
                    Restore
                  </button>
                  <button onClick={() => deleteTaskPermanently(t.id)} title="Delete permanently" style={{ fontSize: 10.5, border: "1px solid #D6454544", background: "transparent", color: "#D64545", borderRadius: 6, padding: "3px 7px" }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        .pulsering { position: absolute; inset: -8px; border-radius: 50%; border: 2px solid #D6454566; animation: pulse 1.4s ease-out infinite; }
        @keyframes pulse { 0% { transform: scale(0.9); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }
      `}</style>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1C1F26",
            color: "#fff",
            fontSize: 13,
            padding: "10px 18px",
            borderRadius: 10,
            boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
            zIndex: 50,
            maxWidth: "90%",
            textAlign: "center",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
