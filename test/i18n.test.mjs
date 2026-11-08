import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { LANGUAGES, LANG_STORAGE_KEY, MESSAGES, readLang, translate } from "../src/i18n.js";

const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");

afterEach(() => {
  if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
  else delete globalThis.localStorage;
  if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
  else delete globalThis.navigator;
});

function mockStorage(value) {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem(key) { assert.equal(key, LANG_STORAGE_KEY); return value; },
      setItem() {},
    },
  });
}
function mockNavigator(value) {
  Object.defineProperty(globalThis, "navigator", { configurable: true, value });
}
function removeNavigator() {
  delete globalThis.navigator;
}

test("language metadata and the storage key stay stable", () => {
  assert.equal(LANG_STORAGE_KEY, "campus-pass-lang-v1");
  assert.deepEqual(LANGUAGES.map(language => language.id), ["zh", "en"]);
  assert.deepEqual(LANGUAGES.map(language => language.label), ["中文", "EN"]);
  for (const language of LANGUAGES) assert.equal(typeof MESSAGES.en[language.nameKey], "string");
});

test("English and Chinese dictionaries have identical key sets and non-empty values", () => {
  const en = Object.keys(MESSAGES.en).sort();
  const zh = Object.keys(MESSAGES.zh).sort();
  const placeholders = value => [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map(match => match[1]).sort();
  assert.deepEqual(zh, en);
  assert.equal(en.length, zh.length);
  for (const key of en) {
    assert.equal(typeof MESSAGES.en[key], "string", `en: ${key}`);
    assert.equal(typeof MESSAGES.zh[key], "string", `zh: ${key}`);
    assert.notEqual(MESSAGES.en[key].trim(), "", `en: ${key}`);
    assert.notEqual(MESSAGES.zh[key].trim(), "", `zh: ${key}`);
    assert.deepEqual(placeholders(MESSAGES.zh[key]), placeholders(MESSAGES.en[key]), `placeholders: ${key}`);
  }
});

test("translate interpolates variables and leaves unknown placeholders intact", () => {
  assert.equal(translate("en", "activity.claim", { name: "Maya Chen", id: 1 }), "Maya Chen claimed demo pass #1.");
  assert.equal(translate("zh", "activity.claim", { name: "Maya Chen", id: 2 }), "Maya Chen 领取了演示通行证 #2。");
  assert.equal(translate("en", "status.confirm", { action: "claim" }), "Confirm claim in your wallet.");
  assert.equal(translate("en", "ledger.count", { checked: 2, total: 5 }), "2 / 5 checked in");
  assert.equal(translate("en", "ledger.count", { checked: 2 }), "2 / {total} checked in");
  assert.equal(translate("en", "ledger.count", { checked: 2, total: 5, extra: "x" }), "2 / 5 checked in");
  assert.equal(translate("en", "ledger.count"), "{checked} / {total} checked in");
});

test("translate falls back to English first and then to the key", () => {
  MESSAGES.en["test.englishOnly"] = "English fallback";
  try {
    assert.equal(translate("zh", "test.englishOnly"), "English fallback");
  } finally {
    delete MESSAGES.en["test.englishOnly"];
  }
  assert.equal(translate("en", "test.missing"), "test.missing");
  assert.equal(translate("zh", "test.missing"), "test.missing");
  assert.equal(translate("fr", "nav.yourPass"), "Your pass");
});

test("readLang prefers a valid saved preference over the browser language", () => {
  mockStorage("zh");
  mockNavigator({ language: "en-US" });
  assert.equal(readLang(), "zh");
  mockStorage("en");
  mockNavigator({ language: "zh-CN" });
  assert.equal(readLang(), "en");
  mockStorage(" ZH ");
  mockNavigator({ language: "en-US" });
  assert.equal(readLang(), "zh");
});

test("readLang ignores invalid saved values and uses navigator.language", () => {
  mockStorage("fr");
  mockNavigator({ language: "zh-CN" });
  assert.equal(readLang(), "zh");
  mockStorage(null);
  mockNavigator({ language: "zh-Hans-CN" });
  assert.equal(readLang(), "zh");
  mockStorage(null);
  mockNavigator({ language: "en-GB" });
  assert.equal(readLang(), "en");
});

test("readLang defaults to English without storage or navigator hints", () => {
  mockStorage(null);
  mockNavigator({});
  assert.equal(readLang(), "en");
  mockStorage(null);
  removeNavigator();
  assert.equal(readLang(), "en");
});

test("readLang falls back to navigator.languages and survives blocked storage", () => {
  mockStorage(null);
  mockNavigator({ languages: ["zh-TW", "en"] });
  assert.equal(readLang(), "zh");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("Storage blocked"); } });
  mockNavigator({ language: "zh-CN" });
  assert.equal(readLang(), "zh");
});

test("readLang tolerates a throwing localStorage.getItem", () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem() { throw new Error("Storage blocked"); },
      setItem() {},
    },
  });
  mockNavigator({ language: "en-US" });
  assert.equal(readLang(), "en");
});
