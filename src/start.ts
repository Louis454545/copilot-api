#!/usr/bin/env node

import { defineCommand } from "citty"
import clipboard from "clipboardy"
import consola from "consola"
import { serve, type ServerHandler } from "srvx"
import invariant from "tiny-invariant"
import { spawn } from "node:child_process"
import { logger } from "hono/logger"

import { ensurePaths } from "./lib/paths"
import { generateEnvScript } from "./lib/shell"
import { state } from "./lib/state"
import { setupCopilotToken, setupGitHubToken } from "./lib/token"
import { cacheModels, cacheVSCodeVersion } from "./lib/utils"
import { server } from "./server"

interface RunServerOptions {
  port: number
  verbose: boolean
  accountType: string
  manual: boolean
  rateLimit?: number
  rateLimitWait: boolean
  githubToken?: string
  claudeCode: boolean
  showToken: boolean
  bypassCredit: boolean
  silentMode: boolean
}

export async function runServer(options: RunServerOptions): Promise<void> {
  if (options.verbose) {
    consola.level = 5
    consola.info("Verbose logging enabled")
  } else if (options.claudeCode) {
    consola.level = 0 // Supprimer tous les logs seulement en mode claude-code
  }

  state.accountType = options.accountType
  if (options.accountType !== "individual") {
    consola.info(`Using ${options.accountType} plan GitHub account`)
  }

  state.manualApprove = options.manual
  state.rateLimitSeconds = options.rateLimit
  state.rateLimitWait = options.rateLimitWait
  state.showToken = options.showToken
  state.bypassCredit = options.bypassCredit
  state.silentMode = options.silentMode

  await ensurePaths()
  await cacheVSCodeVersion()

  if (options.githubToken) {
    state.githubToken = options.githubToken
    consola.info("Using provided GitHub token")
  } else {
    await setupGitHubToken()
  }

  await setupCopilotToken()
  await cacheModels()

  consola.info(
    `Available models: \n${state.models?.data.map((model) => `- ${model.id}`).join("\n")}`,
  )

  // Ajouter le logger seulement si pas en mode claude-code
  if (!options.claudeCode) {
    server.use(logger())
  }

  const serverUrl = `http://localhost:${options.port}`

  if (options.claudeCode) {
    invariant(state.models, "Models should be loaded by now")

    // Démarrer le serveur en arrière-plan
    serve({
      fetch: server.fetch as ServerHandler,
      port: options.port,
      silent: true, // Désactiver le log "Listening on" en mode claude-code
    })

    // Créer la commande PowerShell avec les modèles prédéfinis
    const powershellCommand = `$env:ANTHROPIC_BASE_URL="${serverUrl}"; $env:ANTHROPIC_AUTH_TOKEN="dummy"; $env:ANTHROPIC_MODEL="claude-sonnet-4"; $env:ANTHROPIC_SMALL_FAST_MODEL="gpt-4.1-2025-04-14"; claude --dangerously-skip-permissions`

    // Lancer Claude Code via PowerShell
    const claudeProcess = spawn('powershell', ['-Command', powershellCommand], {
      stdio: 'inherit'
    })

    // Gérer la sortie de Claude Code
    claudeProcess.on('exit', (code) => {
      consola.info(`Claude Code exited with code ${code}`)
      process.exit(code || 0)
    })

    // Gérer les signaux pour fermer proprement
    process.on('SIGINT', () => {
      claudeProcess.kill('SIGINT')
    })

    process.on('SIGTERM', () => {
      claudeProcess.kill('SIGTERM')
    })

    return // Ne pas continuer avec le serveur normal
  }

  consola.box(
    `🌐 Usage Viewer: https://ericc-ch.github.io/copilot-api?endpoint=${serverUrl}/usage`,
  )

  serve({
    fetch: server.fetch as ServerHandler,
    port: options.port,
  })
}

export const start = defineCommand({
  meta: {
    name: "start",
    description: "Start the Copilot API server",
  },
  args: {
    port: {
      alias: "p",
      type: "string",
      default: "4141",
      description: "Port to listen on",
    },
    verbose: {
      alias: "v",
      type: "boolean",
      default: false,
      description: "Enable verbose logging",
    },
    "account-type": {
      alias: "a",
      type: "string",
      default: "individual",
      description: "Account type to use (individual, business, enterprise)",
    },
    manual: {
      type: "boolean",
      default: false,
      description: "Enable manual request approval",
    },
    "rate-limit": {
      alias: "r",
      type: "string",
      description: "Rate limit in seconds between requests",
    },
    wait: {
      alias: "w",
      type: "boolean",
      default: false,
      description:
        "Wait instead of error when rate limit is hit. Has no effect if rate limit is not set",
    },
    "github-token": {
      alias: "g",
      type: "string",
      description:
        "Provide GitHub token directly (must be generated using the `auth` subcommand)",
    },
    "claude-code": {
      alias: "c",
      type: "boolean",
      default: false,
      description:
        "Generate a command to launch Claude Code with Copilot API config",
    },
    "show-token": {
      type: "boolean",
      default: false,
      description: "Show GitHub and Copilot tokens on fetch and refresh",
    },
    "bypass-credit": {
      type: "boolean",
      default: false,
      description: "Automatically inject hey/hello messages for credit bypass",
    },
  },
  run({ args }) {
    const rateLimitRaw = args["rate-limit"]
    const rateLimit =
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      rateLimitRaw === undefined ? undefined : Number.parseInt(rateLimitRaw, 10)

    return runServer({
      port: Number.parseInt(args.port, 10),
      verbose: args.verbose,
      accountType: args["account-type"],
      manual: args.manual,
      rateLimit,
      rateLimitWait: args.wait,
      githubToken: args["github-token"],
      claudeCode: args["claude-code"],
      showToken: args["show-token"],
      bypassCredit: args["bypass-credit"] || args["claude-code"], // Auto-activer bypass-credit avec claude-code
      silentMode: args["claude-code"], // Mode silencieux automatique avec claude-code
    })
  },
})
