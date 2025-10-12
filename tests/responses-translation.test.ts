import { describe, expect, test } from "bun:test"

import type { AnthropicMessagesPayload } from "~/routes/messages/anthropic-types"
import type { ResponsesResult } from "~/services/copilot/create-responses"

import {
  translateAnthropicMessagesToResponsesPayload,
  translateResponsesResultToAnthropic,
} from "~/routes/messages/responses-translation"

describe("Responses API to Anthropic Non-Streaming Translation", () => {
  test("should translate a simple text response correctly", () => {
    const responsesResult: ResponsesResult = {
      id: "resp_abc123",
      object: "response",
      created_at: 1234567890,
      model: "gpt-5-codex",
      output: [
        {
          type: "message",
          id: "msg_1",
          role: "assistant",
          content: [
            {
              type: "text",
              text: "Hello! How can I help you today?",
            },
          ],
          status: "completed",
        },
      ],
      output_text: "Hello! How can I help you today?",
      status: "completed",
      usage: {
        input_tokens: 10,
        output_tokens: 8,
        total_tokens: 18,
      },
      error: null,
      incomplete_details: null,
      instructions: null,
      metadata: null,
      parallel_tool_calls: false,
      temperature: null,
      tool_choice: null,
      tools: [],
      top_p: null,
    }

    const anthropicResponse =
      translateResponsesResultToAnthropic(responsesResult)

    expect(anthropicResponse.id).toBe("resp_abc123")
    expect(anthropicResponse.model).toBe("gpt-5-codex")
    expect(anthropicResponse.role).toBe("assistant")
    expect(anthropicResponse.stop_reason).toBe("end_turn")
    expect(anthropicResponse.content).toHaveLength(1)

    const textBlock = anthropicResponse.content[0]
    expect(textBlock.type).toBe("text")
    if (textBlock.type === "text") {
      expect(textBlock.text).toBe("Hello! How can I help you today?")
    }
  })

  test("should translate a response with reasoning and tool calls", () => {
    const responsesResult: ResponsesResult = {
      id: "resp_xyz789",
      object: "response",
      created_at: 1234567890,
      model: "gpt-5-codex",
      output: [
        {
          type: "reasoning",
          id: "reasoning_1",
          role: "assistant",
          content: [],
          reasoning: [
            {
              type: "reasoning",
              reasoning: "Thinking about the task and how to approach it.",
            },
          ],
          summary: [
            {
              type: "reasoning_summary",
              summary: "Task analysis complete",
            },
          ],
          status: "completed",
        },
        {
          type: "function_call",
          id: "call_1",
          role: "assistant",
          name: "TodoWrite",
          arguments: JSON.stringify({
            todos: [
              {
                content: "Read src/routes/responses/translation.ts",
                status: "in_progress",
              },
            ],
          }),
          status: "completed",
        },
        {
          type: "message",
          id: "msg_2",
          role: "assistant",
          content: [
            {
              type: "text",
              text: "I've added the task to your todo list.",
            },
          ],
          status: "completed",
        },
      ],
      output_text: "I've added the task to your todo list.",
      status: "completed",
      usage: {
        input_tokens: 120,
        output_tokens: 56,
        total_tokens: 176,
        output_tokens_details: {
          reasoning_tokens: 20,
        },
      },
      error: null,
      incomplete_details: null,
      instructions: null,
      metadata: null,
      parallel_tool_calls: false,
      temperature: null,
      tool_choice: null,
      tools: [],
      top_p: null,
    }

    const anthropicResponse =
      translateResponsesResultToAnthropic(responsesResult)

    expect(anthropicResponse.id).toBe("resp_xyz789")
    // Should have at least 2 blocks: tool_use and text (reasoning may be included)
    expect(anthropicResponse.content.length).toBeGreaterThanOrEqual(2)

    // Find blocks by type
    const thinkingBlock = anthropicResponse.content.find(
      (b) => b.type === "thinking",
    )
    const toolUseBlock = anthropicResponse.content.find(
      (b) => b.type === "tool_use",
    )
    const textBlock = anthropicResponse.content.find((b) => b.type === "text")

    // Verify thinking block if present
    if (thinkingBlock) {
      expect(thinkingBlock.thinking).toContain("Thinking about the task")
    }

    // Verify tool use block
    expect(toolUseBlock).toBeDefined()
    if (toolUseBlock) {
      expect(toolUseBlock.id).toBe("call_1")
      expect(toolUseBlock.name).toBe("TodoWrite")
      expect(toolUseBlock.input).toEqual({
        todos: [
          {
            content: "Read src/routes/responses/translation.ts",
            status: "in_progress",
          },
        ],
      })
    }

    // Verify text block
    expect(textBlock).toBeDefined()
    if (textBlock) {
      expect(textBlock.text).toBe("I've added the task to your todo list.")
    }
  })

  test("should handle incomplete responses with max_tokens stop reason", () => {
    const responsesResult: ResponsesResult = {
      id: "resp_incomplete",
      object: "response",
      created_at: 1234567890,
      model: "gpt-5-codex",
      output: [
        {
          type: "message",
          id: "msg_1",
          role: "assistant",
          content: [
            {
              type: "text",
              text: "This is a partial respon",
            },
          ],
          status: "incomplete",
        },
      ],
      output_text: "This is a partial respon",
      status: "incomplete",
      usage: {
        input_tokens: 10,
        output_tokens: 100,
        total_tokens: 110,
      },
      error: null,
      incomplete_details: { reason: "max_output_tokens" },
      instructions: null,
      metadata: null,
      parallel_tool_calls: false,
      temperature: null,
      tool_choice: null,
      tools: [],
      top_p: null,
    }

    const anthropicResponse =
      translateResponsesResultToAnthropic(responsesResult)

    expect(anthropicResponse.stop_reason).toBe("max_tokens")
  })

  test("should handle failed responses gracefully", () => {
    const responsesResult: ResponsesResult = {
      id: "resp_failed",
      object: "response",
      created_at: 1234567890,
      model: "gpt-5-codex",
      output: [],
      output_text: "",
      status: "failed",
      usage: {
        input_tokens: 10,
        output_tokens: 0,
        total_tokens: 10,
      },
      error: {
        message: "Model overloaded",
      },
      incomplete_details: null,
      instructions: null,
      metadata: null,
      parallel_tool_calls: false,
      temperature: null,
      tool_choice: null,
      tools: [],
      top_p: null,
    }

    const anthropicResponse =
      translateResponsesResultToAnthropic(responsesResult)

    expect(anthropicResponse.id).toBe("resp_failed")
    expect(anthropicResponse.stop_reason).toBe(null)
    expect(anthropicResponse.content).toHaveLength(0)
  })

  test("should handle tool result with images in input translation", () => {
    const anthropicPayload: AnthropicMessagesPayload = {
      model: "gpt-5-codex",
      messages: [
        { role: "user", content: "Get me an image" },
        {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "tool_123",
              name: "get_image",
              input: { query: "cat" },
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "tool_123",
              content: [
                { type: "text", text: "Here is the image:" },
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/png",
                    data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                  },
                },
              ],
            },
          ],
        },
      ],
      max_tokens: 100,
    }

    const responsesPayload =
      translateAnthropicMessagesToResponsesPayload(anthropicPayload)

    expect(responsesPayload).toBeDefined()
    expect(Array.isArray(responsesPayload.input)).toBe(true)

    const inputItems = responsesPayload.input as Array<Record<string, unknown>>

    // Should have: user message, function_call, function_call_output, and user message with image
    const functionCallOutput = inputItems.find(
      (item) => item.type === "function_call_output",
    )
    expect(functionCallOutput).toBeDefined()
    expect(functionCallOutput?.output).toBe("Here is the image:")

    // Image should be in a separate user message
    const userMessages = inputItems.filter(
      (item) =>
        item.type === "message" && (item as { role?: string }).role === "user",
    )
    expect(userMessages.length).toBeGreaterThanOrEqual(1)

    // Find the message with image content
    const messageWithImage = userMessages.find((msg) => {
      const content = (msg as { content?: Array<unknown> }).content
      return (
        Array.isArray(content)
        && content.some((c) => (c as { type?: string }).type === "input_image")
      )
    })

    expect(messageWithImage).toBeDefined()
  })

  test("should handle tool result with only string content", () => {
    const anthropicPayload: AnthropicMessagesPayload = {
      model: "gpt-5-codex",
      messages: [
        { role: "user", content: "Get me data" },
        {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "tool_123",
              name: "get_data",
              input: { query: "test" },
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "tool_123",
              content: "Here is the data result",
            },
          ],
        },
      ],
      max_tokens: 100,
    }

    const responsesPayload =
      translateAnthropicMessagesToResponsesPayload(anthropicPayload)

    expect(responsesPayload).toBeDefined()
    expect(Array.isArray(responsesPayload.input)).toBe(true)

    const inputItems = responsesPayload.input as Array<Record<string, unknown>>

    const functionCallOutput = inputItems.find(
      (item) => item.type === "function_call_output",
    )
    expect(functionCallOutput).toBeDefined()
    expect(functionCallOutput?.output).toBe("Here is the data result")
  })

  test("should handle tool result with multiple images", () => {
    const anthropicPayload: AnthropicMessagesPayload = {
      model: "gpt-5-codex",
      messages: [
        { role: "user", content: "Get me images" },
        {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "tool_123",
              name: "get_images",
              input: { count: 2 },
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "tool_123",
              content: [
                { type: "text", text: "Found images:" },
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/png",
                    data: "image1data",
                  },
                },
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/png",
                    data: "image2data",
                  },
                },
              ],
            },
          ],
        },
      ],
      max_tokens: 100,
    }

    const responsesPayload =
      translateAnthropicMessagesToResponsesPayload(anthropicPayload)

    expect(responsesPayload).toBeDefined()
    expect(Array.isArray(responsesPayload.input)).toBe(true)

    const inputItems = responsesPayload.input as Array<Record<string, unknown>>

    // Should have function_call_output with text
    const functionCallOutput = inputItems.find(
      (item) => item.type === "function_call_output",
    )
    expect(functionCallOutput).toBeDefined()
    expect(functionCallOutput?.output).toBe("Found images:")

    // Should have user message with images
    const messageWithImages = inputItems.find((item) => {
      if (item.type !== "message") return false
      const content = (item as { content?: Array<unknown> }).content
      if (!Array.isArray(content)) return false
      const imageCount = content.filter(
        (c) => (c as { type?: string }).type === "input_image",
      ).length
      return imageCount === 2
    })

    expect(messageWithImages).toBeDefined()
  })
})
