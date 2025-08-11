import { createServer } from "node:net"

/**
 * Vérifie si un port est disponible
 */
export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()
    
    server.listen(port, () => {
      server.close(() => {
        resolve(true)
      })
    })
    
    server.on('error', () => {
      resolve(false)
    })
  })
}

/**
 * Trouve un port libre en commençant par le port demandé
 * Si le port est occupé, essaie les ports suivants jusqu'à trouver un libre
 */
export async function findAvailablePort(startPort: number, maxTries: number = 10): Promise<number> {
  for (let i = 0; i < maxTries; i++) {
    const port = startPort + i
    const available = await isPortAvailable(port)
    
    if (available) {
      return port
    }
  }
  
  throw new Error(`Aucun port libre trouvé entre ${startPort} et ${startPort + maxTries - 1}`)
}