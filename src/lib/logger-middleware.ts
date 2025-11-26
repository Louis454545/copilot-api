import type { Context, MiddlewareHandler } from "hono"

import type { HonoEnv } from "~/types"

const getPath = (request: Request) => {
  try {
    const url = new URL(request.url)
    return url.pathname + url.search
  } catch {
    return request.url
  }
}

export const logger = (): MiddlewareHandler<HonoEnv> => {
  return async (c: Context<HonoEnv>, next) => {
    const { method } = c.req
    const path = getPath(c.req.raw)

    console.log(`<-- ${method} ${path}`)

    const start = Date.now()

    await next()

    const end = Date.now()
    const timeMs = end - start
    const timeStr =
      timeMs < 1000 ? `${timeMs}ms` : `${Math.round(timeMs / 1000)}s`
    const status = c.res.status

    const model = c.get("requestModel")
    const modelStr = model ? ` \x1b[33m${model}\x1b[0m` : ""

    // Color status code
    let statusStr = `${status}`
    if (status >= 500) {
      statusStr = `\x1b[31m${status}\x1b[0m` // Red
    } else if (status >= 400) {
      statusStr = `\x1b[33m${status}\x1b[0m` // Yellow
    } else if (status >= 300) {
      statusStr = `\x1b[36m${status}\x1b[0m` // Cyan
    } else if (status >= 200) {
      statusStr = `\x1b[32m${status}\x1b[0m` // Green
    }

    console.log(`--> ${method} ${path} ${statusStr} ${timeStr}${modelStr}`)
  }
}
