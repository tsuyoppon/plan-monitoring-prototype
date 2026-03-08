export const APP_ROLES = ['viewer', 'editor', 'admin'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const canEditRole = (role?: string | null) => role === 'editor' || role === 'admin';

export const isAppRole = (role: string): role is AppRole => {
  return APP_ROLES.includes(role as AppRole);
};
