import type { AnthropicMessage } from "~/routes/messages/anthropic-types"
import type {
  ResponseInputItem,
  ResponseInputMessage,
} from "~/services/copilot/create-responses"

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
  return messages.length === 1 && messages[0]?.role === "user"
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

const isResponseMessageItem = (
  item: ResponseInputItem,
): item is ResponseInputMessage =>
  Boolean(item) && typeof (item as ResponseInputMessage).role === "string"

const shouldBypassResponsesInput = (
  input: Array<ResponseInputItem>,
  bypassEnabled: boolean,
): boolean => {
  if (!bypassEnabled) {
    return false
  }

  const messageItems = input.filter((candidate) =>
    isResponseMessageItem(candidate),
  )

  const assistantItems = messageItems.filter(
    (item) => item.role === "assistant",
  )

  if (assistantItems.length > 0) {
    return false
  }

  return messageItems.length > 0 && messageItems[0].role === "user"
}

const injectBypassResponseMessages = (
  input: Array<ResponseInputItem>,
): Array<ResponseInputItem> => {
  const bypassMessages: Array<ResponseInputMessage> = [
    {
      type: "message",
      role: "user",
      content: "hey",
    },
    {
      type: "message",
      role: "assistant",
      content: "hello",
    },
  ]

  return [...bypassMessages, ...input]
}

export const processResponsesInputWithBypass = (
  input: ResponseInputItem | Array<ResponseInputItem> | string | undefined,
  bypassEnabled: boolean,
): ResponseInputItem | Array<ResponseInputItem> | string | undefined => {
  if (!Array.isArray(input)) {
    return input
  }

  if (!shouldBypassResponsesInput(input, bypassEnabled)) {
    return input
  }

  return injectBypassResponseMessages(input)
}
