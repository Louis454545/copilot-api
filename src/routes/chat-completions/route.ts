import { Hono } from "hono"

import { forwardError } from "~/lib/error"
import { type HonoEnv } from "~/types"

import { handleCompletion } from "./handler"

export const completionRoutes = new Hono<HonoEnv>()

completionRoutes.post("/", async (c) => {
  try {
    return await handleCompletion(c)
  } catch (error) {
    return await forwardError(c, error)
  }
})
