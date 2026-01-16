// Re-export all actions from domain-specific files
// This maintains backward compatibility while improving bundle splitting

export { login, getCurrentUser, getSessionId } from './auth';

// Export everything else from the original actions file for now
// We'll gradually migrate functions to domain-specific files
export * from '../actions';
