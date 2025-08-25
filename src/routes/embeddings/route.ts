import { Hono } from "hono"

import { forwardError } from "~/lib/error"
import { requestLogger } from "~/lib/request-logger"
import {
  createEmbeddings,
  type EmbeddingRequest,
} from "~/services/copilot/create-embeddings"

export const embeddingRoutes = new Hono()

embeddingRoutes.post("/", async (c) => {
  try {
    const paylod = await c.req.json<EmbeddingRequest>()

    // Log request to JSON file
    await requestLogger.logRequest(
      "/embeddings",
      "POST",
      paylod,
      c.req.header("User-Agent"),
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip")
    )

    const response = await createEmbeddings(paylod)

    return c.json(response)
  } catch (error) {
    return await forwardError(c, error)
  }
})
