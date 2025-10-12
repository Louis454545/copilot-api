import { describe, expect, test } from "bun:test"

import type { ResponsesResult } from "~/services/copilot/create-responses"

import { translateResponsesResultToAnthropic } from "~/routes/messages/responses-translation"

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
})
