import { Hono } from "hono"

import { forwardError } from "~/lib/error"
import { type HonoEnv } from "~/types"

import { handleCountTokens } from "./count-tokens-handler"
import { handleCompletion } from "./handler"

export const messageRoutes = new Hono<HonoEnv>()

messageRoutes.post("/", async (c) => {
  try {
    return await handleCompletion(c)
  } catch (error) {
    return await forwardError(c, error)
  }
})

messageRoutes.post("/count_tokens", async (c) => {
  try {
    return await handleCountTokens(c)
  } catch (error) {
    return await forwardError(c, error)
  }
})
