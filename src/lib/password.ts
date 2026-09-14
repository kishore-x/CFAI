import bcrypt from "bcryptjs";

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// Two-word-plus-number passphrase (e.g. "Cedar-Comet-47") rather than
// random gibberish — easy to read aloud, text, or type on a phone. These
// are one-time: every account forces a real password on first login.
const TEMP_PASSWORD_WORDS = [
  "Falcon", "Comet", "Tiger", "Maple", "River", "Cedar", "Coral", "Orbit",
  "Nova", "Ember", "Basil", "Quartz", "Delta", "Harbor", "Willow", "Granite",
  "Meadow", "Zephyr", "Amber", "Cobalt", "Lumen", "Summit", "Anchor", "Pixel",
];

export function generateTempPassword() {
  const first = TEMP_PASSWORD_WORDS[Math.floor(Math.random() * TEMP_PASSWORD_WORDS.length)];
  let second = TEMP_PASSWORD_WORDS[Math.floor(Math.random() * TEMP_PASSWORD_WORDS.length)];
  while (second === first) {
    second = TEMP_PASSWORD_WORDS[Math.floor(Math.random() * TEMP_PASSWORD_WORDS.length)];
  }
  const number = Math.floor(10 + Math.random() * 90);
  return `${first}-${second}-${number}`;
}
