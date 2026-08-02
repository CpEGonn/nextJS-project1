const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim();

export const API_BASE = BASE_URL?.includes("://") ? BASE_URL : BASE_URL ? `https://${BASE_URL}` : "";