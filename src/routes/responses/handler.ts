import type { Context } from "hono"

import consola from "consola"
import { streamSSE } from "hono/streaming"

import { awaitApproval } from "~/lib/approval"
import { processResponsesInputWithBypass } from "~/lib/bypass-credit"
import { checkRateLimit } from "~/lib/rate-limit"
import { state } from "~/lib/state"
import {
  createResponses,
  type ResponsesPayload,
  type ResponsesResult,
} from "~/services/copilot/create-responses"

import { getResponsesRequestOptions } from "./utils"

const RESPONSES_ENDPOINT = "/responses"

export const handleResponses = async (c: Context) => {
  await checkRateLimit(state)

  const payload = await c.req.json<ResponsesPayload>()
  consola.debug(
    "Responses request payload:",
    JSON.stringify(payload).slice(-400),
  )

  const processedPayload: ResponsesPayload = {
    ...payload,
    input: processResponsesInputWithBypass(payload.input, state.bypassCredit),
  }

  const selectedModel = state.models?.data.find(
    (model) => model.id === processedPayload.model,
  )
  const supportsResponses =
    selectedModel?.supported_endpoints?.includes(RESPONSES_ENDPOINT) ?? false

  if (!supportsResponses) {
    return c.json(
      {
        error: {
          message:
            "This model does not support the responses endpoint. Please choose a different model.",
          type: "invalid_request_error",
        },
      },
      400,
    )
  }

  const { vision, initiator } = getResponsesRequestOptions(processedPayload)

  if (state.manualApprove) {
    await awaitApproval()
  }

  const response = await createResponses(processedPayload, {
    vision,
    initiator,
  })

  if (isStreamingRequested(processedPayload) && isAsyncIterable(response)) {
    consola.debug("Forwarding native Responses stream")
    return streamSSE(c, async (stream) => {
      for await (const chunk of response) {
        consola.debug("Responses stream chunk:", JSON.stringify(chunk))
        await stream.writeSSE({
          id: (chunk as { id?: string }).id,
          event: (chunk as { event?: string }).event,
          data: (chunk as { data?: string }).data ?? "",
        })
      }
    })
  }

  consola.debug(
    "Forwarding native Responses result:",
    JSON.stringify(response).slice(-400),
  )
  return c.json(response as ResponsesResult)
}

const isAsyncIterable = <T>(value: unknown): value is AsyncIterable<T> =>
  Boolean(value)
  && typeof (value as AsyncIterable<T>)[Symbol.asyncIterator] === "function"

const isStreamingRequested = (payload: ResponsesPayload): boolean =>
  Boolean(payload.stream)
