import { Hono } from "hono"

import { forwardError } from "~/lib/error"
import { logRequest } from "~/lib/request-logger"
import { state } from "~/lib/state"
import {
  createEmbeddings,
  type EmbeddingRequest,
} from "~/services/copilot/create-embeddings"

export const embeddingRoutes = new Hono()

embeddingRoutes.post("/", async (c) => {
  try {
    const paylod = await c.req.json<EmbeddingRequest>()

    if (state.logRequests) {
      void logRequest({
        endpoint: c.req.path,
        method: c.req.method,
        payload: paylod,
        userAgent: c.req.header("user-agent"),
      })
    }

    const response = await createEmbeddings(paylod)

    return c.json(response)
  } catch (error) {
    return await forwardError(c, error)
  }
})
