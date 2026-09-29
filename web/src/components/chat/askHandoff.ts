/**
 * In-app hand-off of a question from Explorar to /asistente. Only a question the visitor typed or
 * tapped in this tab is sent automatically; an /asistente?q= link from anywhere else only
 * prefills the composer, so a crafted link cannot send a message on the visitor's behalf.
 */
const KEY = "ruta-visigoda:ask";

export function markAskHandoff(question: string): void {
  try {
    window.sessionStorage.setItem(KEY, question);
  } catch {
    // Without sessionStorage the question is only prefilled.
  }
}

/** True (once) when `question` was handed off by markAskHandoff in this tab. */
export function consumeAskHandoff(question: string): boolean {
  try {
    const stored = window.sessionStorage.getItem(KEY);
    if (stored === null) return false;
    window.sessionStorage.removeItem(KEY);
    return stored === question;
  } catch {
    return false;
  }
}
