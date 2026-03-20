import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { validateEnv } from './config'
import { registerWaterTools } from './tools/water'
import { registerWorkoutTools } from './tools/workouts'
import { registerHabitsTools } from './tools/habits'
import { registerMoodTools } from './tools/mood'
import { registerFrenchTools } from './tools/french'

function createServer(): McpServer {
  const server = new McpServer({
    name: 'life-os',
    version: '1.0.0',
  })
  return server
}

export default {
  async fetch(request: Request, env: Record<string, string>): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname !== '/mcp') {
      return new Response('Not found', { status: 404 })
    }

    // Validate environment
    let config
    try {
      config = validateEnv(env)
    } catch (err) {
      console.error(err)
      return new Response('Server misconfigured', { status: 500 })
    }

    // Bearer token auth
    const authHeader = request.headers.get('Authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (token !== config.MCP_API_KEY) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Build server and register all tools
    const server = createServer()
    registerWaterTools(server, config)
    registerWorkoutTools(server, config)
    registerHabitsTools(server, config)
    registerMoodTools(server, config)
    registerFrenchTools(server, config)

    // Handle request via Streamable HTTP transport (Web Standard — compatible with Workers)
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    await server.connect(transport)
    return transport.handleRequest(request)
  },
}
