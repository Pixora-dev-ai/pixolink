import { PixoLink, useConnector, usePlugin } from '@pixora/pixolink';
import type { AIConnector } from '@pixora/pixolink';

/**
 * Example 1: Basic initialization
 */
async function example1_BasicInit() {
  // Initialize PixoLink with config file
  const pixo = await PixoLink.init('./pixo.config.json');

  // Get system status
  const status = await pixo.getStatus();
  console.log('System Status:', status);

  // Shutdown when done
  await pixo.shutdown();
}

/**
 * Example 2: Using connectors
 */
async function example2_UseConnectors() {
  await PixoLink.init();

  // Use AI connector
  const ai = useConnector<AIConnector>('ai-core');
  const result = await ai.generate('Create a beautiful sunset image description', {
    model: 'gemini-2.0-flash-exp',
    temperature: 0.7,
  });
  console.log('AI Response:', result.text);

  // Use database connector
  const db = useConnector('supabase');
  console.log('Database client:', db);

  // Use payment connector
  const payment = useConnector('pixopay');
  const paymentResult = await payment.processPayment({
    amount: 99.99,
    currency: 'USD',
    customerInfo: {
      email: 'customer@example.com',
    },
  });
  console.log('Payment result:', paymentResult);
}

/**
 * Example 3: Event-driven architecture
 */
async function example3_Events() {
  const pixo = await PixoLink.init();

  // Subscribe to events
  pixo.eventBus.on('ai:generation:complete', (data) => {
    console.log('AI generation completed:', data);
  });

  pixo.eventBus.on('payment:success', (data) => {
    console.log('Payment successful:', data);
  });

  // Emit custom event
  await pixo.eventBus.emit('app:started', {
    timestamp: new Date(),
    version: '1.0.0',
  });
}

/**
 * Example 4: Plugin usage
 */
async function example4_Plugins() {
  await PixoLink.init();

  // Get plugin API
  const lumina = usePlugin('lumina');
  console.log('LUMINA plugin:', lumina);

  // Get Logic Guardian
  const guardian = usePlugin('logic-guardian');
  console.log('Logic Guardian:', guardian);
}

/**
 * Example 5: Complete workflow
 */
async function example5_CompleteWorkflow() {
  // Initialize
  await PixoLink.init('./pixo.config.json');

  try {
    // 1. Generate AI content
    const ai = useConnector<AIConnector>('ai-core');
    const prompt = 'A futuristic Egyptian city with neon lights';
    const aiResult = await ai.generate(prompt);
    console.log('Generated description:', aiResult.text);

    // 2. Track analytics
    const analytics = useConnector('analytics');
    await analytics.track({
      name: 'ai_generation_completed',
      properties: {
        prompt,
        model: aiResult.model,
        tokens: aiResult.usage?.outputTokens,
      },
    });

    // 3. Save to database
    const db = useConnector('supabase');
    const client = db.getClient();
    // Save result to database...

    console.log('Workflow completed successfully!');
  } catch (error) {
    console.error('Workflow error:', error);
  } finally {
    await PixoLink.getInstance().shutdown();
  }
}

/**
 * Example 6: Error handling with Logic Guardian
 */
async function example6_ErrorHandling() {
  await PixoLink.init();

  const guardian = usePlugin('logic-guardian');

  // Execute with circuit breaker
  const result = await guardian.executeWithCircuitBreaker(
    async () => {
      const ai = useConnector<AIConnector>('ai-core');
      return await ai.generate('Test prompt');
    },
    {
      maxRetries: 3,
      timeout: 10000,
    }
  );

  console.log('Result with circuit breaker:', result);
}

// Export all examples
export {
  example1_BasicInit,
  example2_UseConnectors,
  example3_Events,
  example4_Plugins,
  example5_CompleteWorkflow,
  example6_ErrorHandling,
};

// Run example
if (require.main === module) {
  example5_CompleteWorkflow()
    .then(() => console.log('Example completed!'))
    .catch((error) => console.error('Example failed:', error));
}
