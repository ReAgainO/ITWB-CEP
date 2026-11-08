export const DEMO_STORAGE_KEY = "campus-pass-demo-v1";
// Roles are semantic so the UI can translate them; the organizer display name is a translation key.
export const DEMO_PROFILES = [
  { id: "maya", name: "Maya Chen", role: "attendee" },
  { id: "leo", name: "Leo Wong", role: "attendee" },
  { id: "organizer", name: "Event organizer", role: "organizer", nameKey: "profile.organizerName" },
];
const MAX_ACTIVITY = 8;

export function emptyDemo() {
  return { profile: "maya", tickets: {}, activity: [] };
}

// Activity is stored as objects (or legacy raw strings) so it can be translated at render time.
function sanitizeActivity(value) {
  if (!Array.isArray(value)) return [];
  const activity = [];
  for (const entry of value) {
    if (typeof entry === "string") {
      activity.push(entry);
      continue;
    }
    if (!entry || typeof entry !== "object") continue;
    const { type, id } = entry;
    if (!Number.isSafeInteger(id) || id <= 0) continue;
    if (type === "checkIn") {
      activity.push({ type: "checkIn", id });
    } else if (type === "claim" && typeof entry.name === "string" && entry.name.trim()) {
      activity.push({ type: "claim", name: entry.name.trim().slice(0, 80), id });
    }
  }
  return activity.slice(0, MAX_ACTIVITY);
}

export function readDemo() {
  try {
    const value = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY));
    if (!value || !DEMO_PROFILES.some(p => p.id === value.profile) || typeof value.tickets !== "object" || !value.tickets) return emptyDemo();
    const tickets = {};
    const ids = new Set();
    for (const p of DEMO_PROFILES) {
      const ticket = value.tickets[p.id];
      if (ticket && Number.isSafeInteger(ticket.id) && ticket.id > 0 && !ids.has(ticket.id) && typeof ticket.checkedIn === "boolean") {
        tickets[p.id] = { id: ticket.id, checkedIn: ticket.checkedIn };
        ids.add(ticket.id);
      }
    }
    return { profile: value.profile, tickets, activity: sanitizeActivity(value.activity) };
  } catch {
    return emptyDemo();
  }
}

export function demoReducer(state, action) {
  if (action.type === "reset") return emptyDemo();
  if (action.type === "profile" && DEMO_PROFILES.some(p => p.id === action.id)) return { ...state, profile: action.id };
  if (action.type === "claim" && !state.tickets[state.profile]) {
    const id = Math.max(0, ...Object.values(state.tickets).map(ticket => ticket.id)) + 1;
    const name = DEMO_PROFILES.find(p => p.id === state.profile).name;
    return {
      ...state,
      tickets: { ...state.tickets, [state.profile]: { id, checkedIn: false } },
      activity: [{ type: "claim", name, id }, ...state.activity].slice(0, MAX_ACTIVITY),
    };
  }
  if (action.type === "checkIn" && state.profile === "organizer") {
    const entry = Object.entries(state.tickets).find(([, ticket]) => ticket.id === action.id && !ticket.checkedIn);
    if (entry) {
      return {
        ...state,
        tickets: { ...state.tickets, [entry[0]]: { ...entry[1], checkedIn: true } },
        activity: [{ type: "checkIn", id: action.id }, ...state.activity].slice(0, MAX_ACTIVITY),
      };
    }
  }
  return state;
}
