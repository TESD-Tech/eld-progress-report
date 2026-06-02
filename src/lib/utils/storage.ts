const PREFIX = 'student-dashboard:'

export function readStorage(key: string, fallback: string): string {
  try {
    return localStorage.getItem(PREFIX + key) ?? fallback
  } catch {
    return fallback
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(PREFIX + key, value)
  } catch {}
}
