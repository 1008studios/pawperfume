const { getBotFlowSteps, getBotFlowState, updateBotFlowState, resetBotFlowState, logMessage } = require("./db");

async function processMessageWithBotFlow({ tenantId, conversationId, messageText, tenant }) {
  const steps = await getBotFlowSteps(tenantId);
  if (!steps || steps.length === 0) return null;

  let state = await getBotFlowState(conversationId);

  if (state?.is_complete) {
    const restartTriggers = ["restart", "start over", "new order", "reset"];
    if (restartTriggers.some(t => messageText.toLowerCase().includes(t))) {
      await resetBotFlowState(conversationId);
      state = { collected_data: {} };
    } else {
      return null;
    }
  }

  if (!state) {
    state = { current_step: null, collected_data: {}, is_complete: false };
  }

  const currentStepKey = state.current_step;
  let currentStep;

  if (currentStepKey) {
    currentStep = steps.find(s => s.step_key === currentStepKey);
    if (!currentStep) {
      await resetBotFlowState(conversationId);
      currentStep = steps.sort((a, b) => a.sort_order - b.sort_order)[0];
    }
  } else {
    currentStep = steps.sort((a, b) => a.sort_order - b.sort_order)[0];
  }

  if (!currentStep) return null;

  return await processFlowStep({ step: currentStep, steps, tenantId, conversationId, messageText, state, tenant });
}

async function processFlowStep({ step, steps, tenantId, conversationId, messageText, state, tenant }) {
  const collectedData = state.collected_data || {};
  let result;

  switch (step.step_type) {
    case "text_input": {
      const varName = step.input_variable || step.step_key;
      collectedData[varName] = messageText;

      if (step.validation?.min_length && messageText.length < step.validation.min_length) {
        result = { reply: `Please provide at least ${step.validation.min_length} characters.`, stepComplete: false };
        break;
      }

      const nextKey = step.next_step;
      await updateBotFlowState(conversationId, { currentStep: nextKey, collectedData });

      const nextStep = nextKey ? steps.find(s => s.step_key === nextKey) : null;
      result = { reply: nextStep?.prompt_message || null, stepComplete: true, nextStep: nextStep || null, collectedData };
      break;
    }
    case "button_choice": {
      const choices = step.button_choices || [];
      const match = choices.find(c =>
        c.label.toLowerCase() === messageText.toLowerCase() ||
        (c.aliases || []).some(a => a.toLowerCase() === messageText.toLowerCase())
      );
      if (!match) {
        result = { reply: step.prompt_message || "Please choose from: " + choices.map(c => c.label).join(", "), stepComplete: false };
        break;
      }
      const varName = step.input_variable || step.step_key;
      collectedData[varName] = match.label;
      const nextKey = match.next_step || step.next_step;
      await updateBotFlowState(conversationId, { currentStep: nextKey, collectedData });
      const nextStep = nextKey ? steps.find(s => s.step_key === nextKey) : null;
      result = { reply: nextStep?.prompt_message || null, stepComplete: true, nextStep: nextStep || null, collectedData };
      break;
    }
    case "image_upload":
    case "auto":
    case "delay":
    default: {
      const nextKey = step.next_step;
      await updateBotFlowState(conversationId, { currentStep: nextKey, collectedData: step.step_type !== "delay" ? collectedData : state.collected_data || {} });
      const nextStep = nextKey ? steps.find(s => s.step_key === nextKey) : null;
      result = { reply: step.prompt_message || nextStep?.prompt_message || null, stepComplete: true, nextStep: nextStep || null, collectedData };
    }
  }
  return result;
}

async function startBotFlow({ tenantId, conversationId, tenant }) {
  const steps = await getBotFlowSteps(tenantId);
  if (!steps || steps.length === 0) return null;
  await resetBotFlowState(conversationId);
  const firstStep = steps.sort((a, b) => a.sort_order - b.sort_order)[0];
  if (!firstStep) return null;
  if (firstStep.step_type === "auto") {
    return processFlowStep({ step: firstStep, steps, tenantId, conversationId, messageText: "", state: { collected_data: {}, is_complete: false }, tenant });
  }
  return { reply: firstStep.prompt_message || null, stepComplete: false };
}

module.exports = { processMessageWithBotFlow, startBotFlow };
