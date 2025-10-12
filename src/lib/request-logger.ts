import consola from "consola"
import fs from "node:fs/promises"
import path from "node:path"

import { PATHS } from "~/lib/paths"

interface RequestLogEntry {
  timestamp: string
  endpoint: string
  method: string
  payload: unknown
  userAgent?: string
}

interface LogRequestOptions {
  endpoint: string
  method: string
  payload: unknown
  userAgent?: string
}

export async function logRequest(options: LogRequestOptions): Promise<void> {
  try {
    const now = new Date()
    const logEntry: RequestLogEntry = {
      timestamp: now.toISOString(),
      endpoint: options.endpoint,
      method: options.method,
      payload: options.payload,
      userAgent: options.userAgent,
    }

    const filename = now
      .toISOString()
      .replaceAll(":", "-")
      .replace(/\.\d+Z$/, "Z")
    const logFilePath = path.join(PATHS.LOGS_DIR, `${filename}.json`)

    await fs.writeFile(logFilePath, JSON.stringify(logEntry, null, 2), "utf8")
  } catch (error) {
    consola.error("Failed to log request:", error)
  }
}
