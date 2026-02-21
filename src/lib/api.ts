const BASE = "/api";

export async function fetchAPI(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || "Something went wrong");
  }
  return res.json();
}