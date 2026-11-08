import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { DEMO_PROFILES, DEMO_STORAGE_KEY, demoReducer, emptyDemo, readDemo } from "../src/demo.js";

const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
afterEach(() => {
  if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
  else delete globalThis.localStorage;
});
function stored(raw) {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem(key) { assert.equal(key, DEMO_STORAGE_KEY); return raw; } },
  });
}
const claim = state => demoReducer(state, { type: "claim" });
const profile = (state, id) => demoReducer(state, { type: "profile", id });
const checkIn = (state, id) => demoReducer(state, { type: "checkIn", id });

test("profiles expose semantic roles instead of display sentences", () => {
  assert.deepEqual(DEMO_PROFILES.map(p => p.role), ["attendee", "attendee", "organizer"]);
  assert.equal(DEMO_PROFILES.find(p => p.id === "organizer").nameKey, "profile.organizerName");
});

test("a profile can claim once; duplicate claims cannot create extra passes or activity", () => {
  const first = claim(emptyDemo());
  assert.deepEqual(first.tickets.maya, { id: 1, checkedIn: false });
  assert.deepEqual(first.activity, [{ type: "claim", name: "Maya Chen", id: 1 }]);
  assert.equal(claim(first), first);
  assert.equal(Object.keys(first.tickets).length, 1);
  assert.equal(first.activity.length, 1);
});

test("attendees cannot check in even their own pass", () => {
  const attendee = claim(emptyDemo());
  assert.equal(checkIn(attendee, 1), attendee);
  assert.equal(checkIn(profile(attendee, "leo"), 1).tickets.maya.checkedIn, false);
});

test("profiles keep independent passes and unique numbers through role switches", () => {
  let state = claim(emptyDemo());
  state = claim(profile(state, "leo"));
  assert.deepEqual(state.tickets.maya, { id: 1, checkedIn: false });
  assert.deepEqual(state.tickets.leo, { id: 2, checkedIn: false });
  state = profile(state, "maya");
  assert.equal(claim(state), state);
  assert.equal(profile(state, "unknown"), state);
});

test("organizer check-in updates only the requested guest and cannot repeat", () => {
  let state = claim(profile(claim(emptyDemo()), "leo"));
  state = profile(state, "organizer");
  const attended = checkIn(state, 1);
  assert.equal(attended.tickets.maya.checkedIn, true);
  assert.equal(attended.tickets.leo.checkedIn, false);
  assert.equal(attended.activity.length, state.activity.length + 1);
  assert.deepEqual(attended.activity[0], { type: "checkIn", id: 1 });
  assert.equal(checkIn(attended, 1), attended);
});

test("nonexistent, zero, negative and non-integer ticket IDs leave state unchanged", () => {
  const organizer = profile(claim(emptyDemo()), "organizer");
  for (const id of [99, 0, -1, 1.5, NaN, Infinity, "1", undefined]) assert.equal(checkIn(organizer, id), organizer);
});

test("check-in survives an immediate profile switch and saved-state round trip", () => {
  let state = profile(claim(emptyDemo()), "organizer");
  state = profile(checkIn(state, 1), "maya");
  stored(JSON.stringify(state));
  const restored = readDemo();
  assert.equal(restored.profile, "maya");
  assert.equal(restored.tickets.maya.checkedIn, true);
  assert.deepEqual(restored, state);
});

test("reset clears all passes and history and restores the first attendee", () => {
  const attended = checkIn(profile(claim(emptyDemo()), "organizer"), 1);
  assert.deepEqual(demoReducer(attended, { type: "reset" }), emptyDemo());
});

test("missing or malformed storage returns a clean usable demo", () => {
  for (const raw of [null, "{broken JSON", "null", "[]", '{"profile":"unknown","tickets":{}}', '{"profile":"maya","tickets":null}']) {
    stored(raw);
    assert.deepEqual(readDemo(), emptyDemo());
  }
});

test("denied browser storage does not stop the demo", () => {
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("Storage blocked"); } });
  assert.deepEqual(readDemo(), emptyDemo());
});

test("stored duplicate IDs and corrupted tickets are removed; the next claim stays unique", () => {
  stored(JSON.stringify({ profile: "leo", tickets: { maya: { id: 7, checkedIn: true }, leo: { id: 7, checkedIn: false }, organizer: { id: -1, checkedIn: "no" }, stranger: { id: 9, checkedIn: false } }, activity: [42, "Valid activity"] }));
  let restored = readDemo();
  assert.deepEqual(restored.tickets, { maya: { id: 7, checkedIn: true } });
  assert.deepEqual(restored.activity, ["Valid activity"]);
  restored = claim(restored);
  assert.equal(restored.tickets.leo.id, 8);
  assert.equal(restored.tickets.maya.checkedIn, true);
  assert.deepEqual(restored.activity[0], { type: "claim", name: "Leo Wong", id: 8 });
});

test("legacy string-only activity is preserved for existing localStorage data", () => {
  stored(JSON.stringify({ profile: "maya", tickets: { maya: { id: 1, checkedIn: true } }, activity: ["Maya Chen claimed demo pass #1.", "Organizer checked in demo pass #1."] }));
  const restored = readDemo();
  assert.deepEqual(restored.activity, ["Maya Chen claimed demo pass #1.", "Organizer checked in demo pass #1."]);
});

test("structured activity is validated, sanitized and capped during migration", () => {
  stored(JSON.stringify({
    profile: "maya",
    tickets: {},
    activity: [
      { type: "claim", name: "Leo Wong", id: 2 },
      { type: "checkIn", id: 2 },
      { type: "claim", name: "  Maya Chen  ", id: 3 },
      { type: "claim", name: "   ", id: 4 },
      { type: "claim", name: "Maya Chen", id: 0 },
      { type: "claim", name: "Maya Chen", id: "3" },
      { type: "unknown", id: 5 },
      { type: "checkIn", id: -1 },
      null,
      42,
      "Legacy line",
    ],
  }));
  assert.deepEqual(readDemo().activity, [
    { type: "claim", name: "Leo Wong", id: 2 },
    { type: "checkIn", id: 2 },
    { type: "claim", name: "Maya Chen", id: 3 },
    "Legacy line",
  ]);

  stored(JSON.stringify({ profile: "maya", tickets: {}, activity: Array.from({ length: 10 }, (_, index) => ({ type: "checkIn", id: index + 1 })) }));
  const capped = readDemo();
  assert.equal(capped.activity.length, 8);
  assert.deepEqual(capped.activity[7], { type: "checkIn", id: 8 });
});
