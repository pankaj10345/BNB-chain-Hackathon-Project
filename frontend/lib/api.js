const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

export function wsUrl() {
  const normalized = API_BASE.replace("http", "ws");
  return `${normalized}/live`;
}

export async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed ${path}: ${res.status}`);
  }
  return res.json();
}
