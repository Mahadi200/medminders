import { app } from './app.js';
import { initializeMfaProvider, assertMfaProductionSafety } from './services/auth/mfaService.js';

// Initialize provider from environment configuration
initializeMfaProvider();

// Verify fail-closed production invariants before listening
assertMfaProductionSafety();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`MedMinders API running on port ${PORT}`);
});
