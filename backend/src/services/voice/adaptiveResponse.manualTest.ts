/**
 * Manual test script for AdaptiveResponseController
 *
 * Validates emotional behavior in isolation:
 *   - Hesitation detection
 *   - Question detection
 *   - Short fragment handling
 *   - Continuous speech (non-interruption)
 *   - AI speaking guard
 *
 * Run:
 *   cd backend
 *   npx ts-node src/services/voice/adaptiveResponse.manualTest.ts
 */

// Set required env vars before any import touches config
process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy';
process.env.JWT_SECRET = 'test-secret';
process.env.ANTHROPIC_API_KEY = 'sk-test-dummy';
process.env.LOG_LEVEL = 'debug';

import { AdaptiveResponseController, ResponseDecisionEvent } from './adaptiveResponseController';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const SESSION = 'test_session';
const controller = new AdaptiveResponseController();

let scenarioName = '';

controller.on('responseDecision', (event: ResponseDecisionEvent) => {
  console.log(
    `  [Test] decision=${event.decision}, reason=${event.reason}, transcript="${event.transcript}"`,
  );
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function header(name: string): void {
  scenarioName = name;
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  ${name}`);
  console.log(`${'='.repeat(70)}`);
}

function resetSession(): void {
  controller.unregisterSession(SESSION);
  controller.registerSession(SESSION);
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

async function scenario1_hesitation(): Promise<void> {
  header('Scenario 1 — Hesitation ("umm I want to go to")');
  resetSession();

  console.log('  > Sending final transcript: "umm I want to go to"');
  controller.onTranscript(SESSION, 'umm I want to go to', true);

  console.log('  > Waiting for encourageSilenceMs (~1000ms)...');
  await delay(1500);
}

async function scenario2_question(): Promise<void> {
  header('Scenario 2 — Question ("How do you say table?")');
  resetSession();

  console.log('  > Sending final transcript: "How do you say table?"');
  controller.onTranscript(SESSION, 'How do you say table?', true);

  console.log('  > Waiting for eagerSilenceMs (~800ms)...');
  await delay(1500);
}

async function scenario3_shortFragment(): Promise<void> {
  header('Scenario 3 — Short fragment ("I...")');
  resetSession();

  console.log('  > Sending final transcript: "I..."');
  console.log('  > Note: "I..." ends with "." — SENTENCE_END regex may match it.');
  console.log('  >        If you see respond_normal instead of extend_wait,');
  console.log('  >        that indicates the regex treats "..." as sentence end.');
  controller.onTranscript(SESSION, 'I...', true);

  console.log('  > Waiting for defaultSilenceMs + extendedSilenceMs (~3700ms)...');
  await delay(4000);
}

async function scenario4_continuousSpeech(): Promise<void> {
  header('Scenario 4 — Continuous speech (no interruption)');
  resetSession();

  console.log('  > Sending interim: "I am"');
  controller.onTranscript(SESSION, 'I am', false);
  await delay(300);

  console.log('  > Sending interim: "I am going"');
  controller.onTranscript(SESSION, 'I am going', false);
  await delay(300);

  console.log('  > Sending final: "I am going to the store"');
  controller.onTranscript(SESSION, 'I am going to the store', true);

  console.log('  > Waiting for defaultSilenceMs (~1200ms)...');
  console.log('  > Expected: NO decision during interims, then extend_wait or respond_normal after silence');
  await delay(4000);
}

async function scenario5_aiSpeakingGuard(): Promise<void> {
  header('Scenario 5 — AI speaking guard');
  resetSession();

  console.log('  > Calling onAISpeechStart()');
  controller.onAISpeechStart(SESSION);

  console.log('  > Sending final transcript while AI speaks: "yes I understand"');
  controller.onTranscript(SESSION, 'yes I understand', true);

  console.log('  > Waiting for timer to fire...');
  await delay(2000);

  console.log('  > Calling onAISpeechEnd()');
  controller.onAISpeechEnd(SESSION);

  console.log('  > Sending utteranceEnd to force evaluation after AI stops');
  controller.onUtteranceEnd(SESSION);

  await delay(2000);
}

// ---------------------------------------------------------------------------
// Run all
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('\n  AdaptiveResponseController — Manual Behavior Validation');
  console.log('  Config: defaultSilence=1200ms, eager=800ms, encourage=1000ms, extended=2500ms\n');

  controller.registerSession(SESSION);

  await scenario1_hesitation();
  await scenario2_question();
  await scenario3_shortFragment();
  await scenario4_continuousSpeech();
  await scenario5_aiSpeakingGuard();

  // Cleanup
  controller.unregisterSession(SESSION);

  console.log(`\n${'='.repeat(70)}`);
  console.log('  All scenarios complete.');
  console.log(`${'='.repeat(70)}\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
