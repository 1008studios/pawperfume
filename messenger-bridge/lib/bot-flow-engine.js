const { getBotFlowSteps, getBotFlowState, updateBotFlowState, resetBotFlowState, logMessage } = require("../api/db");
const { getFaqAnswer } = require("../lib/faq-kb");

async function processMessageWithBotFlow({ tenantId, conversationId, messageText, tenant }) {
  const steps = await getBotFlowSteps(tenantId);
  if (!steps || steps.length === 0) return null; // No flow configured

  let state = await getBotFlowState(conversationId);

  // If state is complete, check for restart keywords
  if (state?.is_complete) {
    const restartTriggers = ["restart", "start over", "new order", "reset"];
    if (restartTriggers.some(t => messageText.toLowerCase().includes(t))) {
      await resetBotFlowState(conversationId);
      state = { collected_data: {} };
    } else {
      return null; // Don't process flow when complete
    }
  }

  if (!state) {
    // Start flow from first step
    state = { current_step: null, collected_data: {}, is_complete: false };
  }

  const currentStepKey = state.current_step;
  let currentStep;

  if (currentStepKey) {
    currentStep = steps.find(s => s.step_key === currentStepKey);
    if (!currentStep) {
      // Invalid state, restart
      await resetBotFlowState(conversationId);
      currentStep = steps.sort((a, b) => a.sort_order - b.sort_order)[0];
    }
  } else {
    currentStep = steps.sort((a, b) => a.sort_order - b.sort_order)[0];
  }

  if (!currentStep) return null;

  const result = await processFlowStep({
    step: currentStep,
    steps,
    tenantId,
    conversationId,
    messageText,
    state,
    tenant,
  });

  return result;
}

async function processFlowStep({ step, steps, tenantId, conversationId, messageText, state, tenant }) {
  const collectedData = state.collected_data || {};

  switch (step.step_type) {
    case "text_input": {
      // Store user's response as the variable value
      const varName = step.input_variable || step.step_key;
      collectedData[varName] = messageText;

      // Validate if configured
      if (step.validation && step.validation.min_length && messageText.length < step.validation.min_length) {
        return {
          reply: `Please provide a longer response (at least ${step.validation.min_length} characters).`,
          stepComplete: false,
        };
      }

      const nextKey = step.next_step;
      await updateBotFlowState(conversationId, {
        currentStep: nextKey,
        collectedData,
      });

      // Send next step prompt
      const nextStep = nextKey ? steps.find(s => s.step_key === nextKey) : null;
      return {
        reply: nextStep?.prompt_message || null,
        stepComplete: true,
        nextStep: nextStep || null,
        collectedData,
      };
    }

    case "button_choice": {
      // Check if message matches a button
      const choices = step.button_choices || [];
      const match = choices.find(c =>
        c.label.toLowerCase() === messageText.toLowerCase() ||
        (c.aliases || []).some(a => a.toLowerCase() === messageText.toLowerCase())
      );

      if (!match) {
        return {
          reply: step.prompt_message || "Please choose from the options: " + choices.map(c => c.label).join(", "),
          stepComplete: false,
        };
      }

      const varName = step.input_variable || step.step_key;
      collectedData[varName] = match.label;

      const nextKey = match.next_step || step.next_step;
      await updateBotFlowState(conversationId, {
        currentStep: nextKey,
        collectedData,
      });

      const nextStep = nextKey ? steps.find(s => s.step_key === nextKey) : null;
      return {
        reply: nextStep?.prompt_message || null,
        stepComplete: true,
        nextStep: nextStep || null,
        collectedData,
      };
    }

    case "image_upload": {
      // For image uploads, we expect an attachment. For text messages here, it might be a mistake.
      const varName = step.input_variable || step.step_key;
      // Since this is a text message, just note it
      collectedData[varName + "_text_note"] = messageText;

      await updateBotFlowState(conversationId, {
        currentStep: step.next_step,
        collectedData,
      });

      const nextStep = step.next_step ? steps.find(s => s.step_key === step.next_step) : null;
      return {
        reply: nextStep?.prompt_message || "Thanks! What's next?",
        stepComplete: true,
        nextStep: nextStep || null,
        collectedData,
      };
    }

    case "auto": {
      // Auto step just moves to next without waiting for input
      const nextKey = step.next_step;
      await updateBotFlowState(conversationId, {
        currentStep: nextKey,
        collectedData,
      });

      const nextStep = nextKey ? steps.find(s => s.step_key === nextKey) : null;
      return {
        reply: step.prompt_message || (nextStep?.prompt_message || null),
        stepComplete: true,
        nextStep: nextStep || null,
        collectedData,
      };
    }

    case "delay": {
      // Delay step — we'll handle in scheduled automation
      return {
        reply: null,
        stepComplete: true,
        delayMs: parseInt(step.prompt_message || "0", 10) || 0,
        collectedData,
      };
    }

    default:
      return { reply: null, stepComplete: true };
  }
}

async function startBotFlow({ tenantId, conversationId, tenant }) {
  const steps = await getBotFlowSteps(tenantId);
  if (!steps || steps.length === 0) return null;

  // Reset any existing state
  await resetBotFlowState(conversationId);

  const firstStep = steps.sort((a, b) => a.sort_order - b.sort_order)[0];
  if (!firstStep) return null;

  // If first step is auto, process it immediately
  if (firstStep.step_type === "auto") {
    return processFlowStep({
      step: firstStep,
      steps,
      tenantId,
      conversationId,
      messageText: "",
      state: { collected_data: {}, is_complete: false },
      tenant,
    });
  }

  return { reply: firstStep.prompt_message || null, stepComplete: false };
}

module.exports = {
  processMessageWithBotFlow,
  startBotFlow,
};
