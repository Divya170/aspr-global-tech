/**
 * Presentation config for the widget, served over the API so the greeting and starter
 * prompts can change without rebuilding the frontend. The starters steer visitors toward
 * questions the knowledge base answers well.
 */
export const CHAT_CONFIG = {
  greeting:
    "Hi! 👋 I'm the ASPR assistant. Ask me about our services, prices, how we work — or tell me what you'd like to build.",
  starters: [
    'What services do you offer?',
    'How much does a website cost?',
    'Do you work with US clients?',
    'I want to start a project',
  ],
};
