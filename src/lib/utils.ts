import type { SSEStreamingApi } from "hono/streaming"

import consola from "consola"

import { getModels } from "~/services/copilot/get-models"
import { getVSCodeVersion } from "~/services/get-vscode-version"

import { state } from "./state"

export const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

export const isNullish = (value: unknown): value is null | undefined =>
  value === null || value === undefined

export async function cacheModels(): Promise<void> {
  const models = await getModels()
  state.models = models
}

export const cacheVSCodeVersion = async () => {
  const response = await getVSCodeVersion()
  state.vsCodeVersion = response

  consola.info(`Using VSCode version: ${response}`)
}

/**
 * Starts a periodic ping for SSE streams to maintain client connections.
 * Critical for long-running operations like reasoning where the model may not
 * send data for extended periods (10s+). Without pings, clients like Claude Code
 * will timeout and retry with stream=false, causing double billing.
 *
 * @param stream - The SSE stream to send pings to
 * @param intervalMs - Interval between pings in milliseconds (default: 3000ms)
 * @returns The interval ID for cleanup
 */
export const startStreamPing = (
  stream: SSEStreamingApi,
  intervalMs: number = 3000,
) => {
  const pingInterval = setInterval(async () => {
    try {
      await stream.writeSSE({
        event: "ping",
        data: "",
      })
      consola.debug("Sent ping")
    } catch (error) {
      consola.warn("Failed to send ping:", error)
      clearInterval(pingInterval)
    }
  }, intervalMs)

  return pingInterval
}
