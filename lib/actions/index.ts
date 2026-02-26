// Re-export all actions from domain-specific files
// This maintains backward compatibility while improving bundle splitting

// Super admin actions from their dedicated file
export * from './super-admin';

// Export everything from the original actions file
// The auth functions (login, getCurrentUser, getSessionId, logout) are
// already exported from lib/actions.ts which re-exports from lib/auth.ts
export * from '../actions';
