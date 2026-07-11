export const DEFAULT_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "duelacred-admin";

export const isAdminPasswordValid = (password: string) => password.trim() === DEFAULT_ADMIN_PASSWORD;
