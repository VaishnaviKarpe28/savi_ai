
import OpenAI from "openai";
import "dotenv/config";

import { brandKnowledge } from "../config/brands.js";

// Gemini API configuration
const ai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL:
    "https://generativelanguage.googleapis.com/v1beta/openai/"
});

const MODEL =
  process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// Temporary conversation memory
const conversations = new Map();

// SAVI AI personality and instructions
const instructions = `
You are SAVI AI, a personal AI assistant and social media manager.

YOUR PERSONALITY:
- Friendly, intelligent and creative.
- Communicate naturally in Hinglish, Hindi or English.
- Understand casual conversations.
- Act like a helpful personal assistant.

YOUR RESPONSIBILITIES:
1. Generate professional LinkedIn posts.
2. Create startup marketing ideas.
3. Write captions and hashtags.
4. Explain engineering projects.
5. Suggest social media strategies.
6. Help with personal branding.
7. Understand the owner's instructions.

USER PROFILE AND PROJECT KNOWLEDGE:
${brandKnowledge}

IMPORTANT RULES:
- Never invent achievements or statistics.
- Never create fake project information.
- Write human-sounding content.
- Keep LinkedIn captions professional.
- Ask questions if important information is missing.
- Never publish any post automatically.
- Every LinkedIn post requires explicit owner approval.
- Never reveal API keys or private credentials.

When asked to create a LinkedIn post, provide:
1. Strong opening hook.
2. Main caption.
3. Relevant hashtags.
4. Suggested image concept.

Remember the previous conversation within the current session.
`;

// Utility: delay between retries
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main AI function
export async function askSavi(channelId, userMessage) {

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing in .env");
  }

  if (!userMessage || !userMessage.trim()) {
    throw new Error("Please provide a message.");
  }

  // Get conversation history
  const history = conversations.get(channelId) || [];

  let response = null;
  let lastError = null;

  // Retry temporary API errors up to 3 attempts
  for (let attempt = 1; attempt <= 3; attempt++) {

    try {

      console.log(
        `SAVI AI: Sending request to Gemini (${attempt}/3)`
      );

      response = await ai.chat.completions.create({
        model: MODEL,

        messages: [
          {
            role: "system",
            content: instructions
          },

          ...history,

          {
            role: "user",
            content: userMessage.trim()
          }
        ],

        max_tokens: 900,

        temperature: 0.7
      });

      break;

    } catch (error) {

      lastError = error;

      const status = error.status;

      const retryable = [
        429,
        500,
        502,
        503,
        504
      ].includes(status);

      console.error(
        `Gemini API error: ${status || "Unknown"}`,
        error.message
      );

      if (!retryable || attempt === 3) {
        throw error;
      }

      const delay = attempt * 3000;

      console.log(
        `Retrying in ${delay / 1000} seconds...`
      );

      await wait(delay);
    }
  }

  if (!response) {
    throw lastError || new Error("Gemini request failed.");
  }

  // Extract AI response
  const answer =
    response.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    throw new Error("Gemini returned an empty response.");
  }

  // Save conversation history
  const updatedHistory = [
    ...history,

    {
      role: "user",
      content: userMessage.trim()
    },

    {
      role: "assistant",
      content: answer
    }

  ].slice(-12);

  conversations.set(channelId, updatedHistory);

  console.log("SAVI AI: Response generated successfully!");

  return answer;
}

// Clear conversation memory
export function clearConversation(channelId) {
  conversations.delete(channelId);
  return true;
}
