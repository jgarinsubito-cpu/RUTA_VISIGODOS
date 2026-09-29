/** Spanish text helpers shared by the router, retrieval and composer. Pure and deterministic. */

/** Lowercase, strip accents/diacritics and collapse punctuation to single spaces. */
export function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();
}

/** Words that carry no retrieval signal. Already normalized. */
export const STOPWORDS = new Set([
  "a", "al", "algo", "ante", "como", "con", "cual", "cuales", "de", "del", "desde", "donde",
  "el", "ella", "ellos", "en", "entre", "era", "eran", "es", "esa", "ese", "eso", "esta", "estan",
  "este", "esto", "fue", "fueron", "ha", "han", "hay", "la", "las", "le", "les", "lo", "los", "me",
  "mi", "mis", "muy", "no", "nos", "o", "para", "pero", "por", "que", "quien", "quienes", "se",
  "ser", "si", "sin", "sobre", "son", "su", "sus", "te", "tu", "tus", "un", "una", "unos", "unas",
  "y", "ya", "yo", "puedo", "puedes", "hoy", "mas", "tambien", "cuando", "hacer", "hace",
]);

/** Question scaffolding that says "tell me about X" without narrowing the topic. */
export const GENERIC_TERMS = new Set([
  "historia", "historico", "historica", "cuentame", "cuenta", "contar", "hablame", "habla",
  "explicame", "explica", "saber", "sabes", "conocer", "sitio", "lugar", "lugares", "visigodo",
  "visigoda", "visigodos", "visigodas", "epoca", "informacion", "dato", "datos", "interesante",
  "importante", "significa", "quiero", "gustaria", "dime", "aqui", "alli",
]);

export function tokens(input: string): string[] {
  const n = normalize(input);
  return n ? n.split(" ") : [];
}

/** Light Spanish stemmer: folds plurals and gender so "coronas" ~ "corona", "visigodos" ~ "visigoda". */
export function stem(word: string): string {
  let w = word;
  if (w.length > 4) w = w.replace(/(es|s)$/, "");
  if (w.length > 5) w = w.replace(/[ao]$/, "");
  return w;
}

/** True when the normalized phrase occurs in the normalized text on word boundaries. */
export function hasPhrase(normalizedText: string, normalizedPhrase: string): boolean {
  if (!normalizedPhrase) return false;
  return ` ${normalizedText} `.includes(` ${normalizedPhrase} `);
}

export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
