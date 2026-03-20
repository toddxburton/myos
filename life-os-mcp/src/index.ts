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

    // Only POST is supported — return 405 for GET/SSE attempts
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } })
    }

    // Validate environment
    let config
    try {
      config = validateEnv(env)
    } catch (err) {
      console.error(err)
      return new Response('Server misconfigured', { status: 500 })
    }

    // Bearer token or API key auth
    const authHeader = request.headers.get('Authorization') ?? ''
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
    const apiKeyHeader = request.headers.get('X-API-Key') ?? ''
    const token = bearerToken || apiKeyHeader
    if (token !== config.MCP_API_KEY) {
      const debugHeaders: Record<string, string> = {}
      request.headers.forEach((v, k) => { debugHeaders[k] = v })
      return new Response(JSON.stringify({ error: 'Unauthorized', received_headers: debugHeaders }), { status: 401, headers: { 'Content-Type': 'application/json' } })
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
