import type { AnthropicMessage } from "~/routes/messages/anthropic-types"

/**
 * Détermine si les messages de bypass credit doivent être injectés
 * Critères: bypassCredit activé ET c'est le premier message de l'utilisateur
 */
export function shouldBypassCredit(
  messages: Array<AnthropicMessage>,
  bypassEnabled: boolean,
): boolean {
  if (!bypassEnabled) {
    return false
  }

  // Vérifie si c'est le premier message utilisateur
  return (
    messages.length === 1 &&
    messages[0]?.role === "user"
  )
}

/**
 * Injecte les messages "hey" (user) et "hello" (assistant) au début
 */
export function injectBypassMessages(
  messages: Array<AnthropicMessage>,
): Array<AnthropicMessage> {
  const bypassMessages: Array<AnthropicMessage> = [
    {
      role: "user",
      content: "hey",
    },
    {
      role: "assistant",
      content: "hello",
    },
  ]

  return [...bypassMessages, ...messages]
}

/**
 * Fonction principale qui traite les messages avec la logique bypass credit
 */
export function processMessagesWithBypass(
  messages: Array<AnthropicMessage>,
  bypassEnabled: boolean,
): Array<AnthropicMessage> {
  if (shouldBypassCredit(messages, bypassEnabled)) {
    return injectBypassMessages(messages)
  }

  return messages
}