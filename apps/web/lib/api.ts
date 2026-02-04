export const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

// Optional: if API_BASE is empty, it will call same-origin relative URLs.
// But since your backend is on a different domain, you want API_BASE set.
export const apiUrl = (path: string) => `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
