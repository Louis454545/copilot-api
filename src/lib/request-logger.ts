import { writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"
import { existsSync } from "node:fs"

interface RequestLog {
  timestamp: string
  endpoint: string
  method: string
  payload: any
  userAgent?: string
  ip?: string
}

export class RequestLogger {
  private logDir: string

  constructor(logDir = "request-logs") {
    this.logDir = logDir
  }

  async ensureLogDir(): Promise<void> {
    if (!existsSync(this.logDir)) {
      await mkdir(this.logDir, { recursive: true })
    }
  }

  async logRequest(
    endpoint: string,
    method: string,
    payload: any,
    userAgent?: string,
    ip?: string
  ): Promise<void> {
    await this.ensureLogDir()

    const log: RequestLog = {
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      payload,
      userAgent,
      ip,
    }

    const filename = `request-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.json`
    const filepath = join(this.logDir, filename)

    try {
      await writeFile(filepath, JSON.stringify(log, null, 2), "utf-8")
    } catch (error) {
      console.error("Failed to write request log:", error)
    }
  }
}

export const requestLogger = new RequestLogger()