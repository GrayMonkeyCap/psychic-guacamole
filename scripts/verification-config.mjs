// Individual scripts still target the developer preview unless the runner supplies its isolated origin.
export const TEST_URL = process.env.SYSTEM_SANDBOX_TEST_URL || 'http://127.0.0.1:5173';
