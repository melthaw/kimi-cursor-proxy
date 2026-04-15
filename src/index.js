import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const KIMI_API_BASE = process.env.KIMI_API_BASE || 'https://api.kimi.com/coding/v1';
const KIMI_MODEL = process.env.KIMI_MODEL || 'kimi-for-coding';

// Middleware
app.use(cors());
app.use(express.json());

// OpenAI to Anthropic format converter
function convertOpenAItoAnthropic(openaiReq) {
  const messages = openaiReq.messages || [];

  // Convert messages to Anthropic format
  const anthropicMessages = messages.map(msg => {
    if (msg.role === 'user') {
      return { role: 'user', content: msg.content };
    } else if (msg.role === 'assistant') {
      return { role: 'assistant', content: msg.content };
    } else if (msg.role === 'system') {
      // System message is handled separately in Anthropic
      return null;
    }
    return null;
  }).filter(msg => msg !== null);

  // Build Anthropic request
  const anthropicReq = {
    model: KIMI_MODEL, // openaiReq.model || 'kimi-k2.5',
    max_tokens: openaiReq.max_tokens || 4096,
    messages: anthropicMessages
  };

  // Add system message if present
  const systemMsg = messages.find(m => m.role === 'system');
  if (systemMsg) {
    anthropicReq.system = systemMsg.content;
  }

  // Add optional parameters
  if (openaiReq.temperature !== undefined) {
    anthropicReq.temperature = openaiReq.temperature;
  }
  if (openaiReq.top_p !== undefined) {
    anthropicReq.top_p = openaiReq.top_p;
  }
  if (openaiReq.stream !== undefined) {
    anthropicReq.stream = openaiReq.stream;
  }

  return anthropicReq;
}

// Anthropic to OpenAI format converter
function convertAnthropicToOpenAI(anthropicResp) {
  const choices = [];

  if (anthropicResp.type === 'message') {
    choices.push({
      index: 0,
      message: {
        role: 'assistant',
        content: anthropicResp.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('')
      },
      finish_reason: anthropicResp.stop_reason || 'stop'
    });

    return {
      id: anthropicResp.id || `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: anthropicResp.created_at || Math.floor(Date.now() / 1000),
      model: anthropicResp.model,
      choices: choices,
      usage: {
        prompt_tokens: anthropicResp.usage?.input_tokens || 0,
        completion_tokens: anthropicResp.usage?.output_tokens || 0,
        total_tokens: (anthropicResp.usage?.input_tokens || 0) + (anthropicResp.usage?.output_tokens || 0)
      }
    };
  }

  // Error response
  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'kimi-k2.5',
    choices: [],
    error: anthropicResp.error
  };
}

// Main proxy endpoint
app.post('/v1/chat/completions', async (req, res) => {
  try {
    // Get API key from request header or environment
    const apiKey = req.headers.authorization?.replace('Bearer ', '') || process.env.KIMI_API_KEY;

    if (!apiKey) {
      return res.status(401).json({
        error: {
          message: 'Missing API key. Provide it in Authorization header or KIMI_API_KEY environment variable.',
          type: 'authentication_error'
        }
      });
    }

    // Convert OpenAI format to Anthropic format
    const anthropicReq = convertOpenAItoAnthropic(req.body);

    console.log(`[Proxy] Forwarding request to Kimi API: ${anthropicReq.model}`);

    // Forward to Kimi API
    const response = await fetch(`${KIMI_API_BASE}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify(anthropicReq)
    });

    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw_response: responseText };
    }

    if (!response.ok) {
      console.error(`[Proxy] Kimi API error: ${response.status} ${responseText}`);
      return res.status(response.status).json({
        error: {
          message: responseData.error?.message || responseText,
          type: responseData.error?.type || 'api_error',
          code: response.status
        }
      });
    }

    // Convert Anthropic response back to OpenAI format
    const openaiResp = convertAnthropicToOpenAI(responseData);

    res.json(openaiResp);

  } catch (error) {
    console.error('[Proxy] Request failed:', error);
    res.status(500).json({
      error: {
        message: error.message,
        type: 'proxy_error'
      }
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'kimi-cursor-proxy' });
});

// Root endpoint with usage info
app.get('/', (req, res) => {
  res.json({
    name: 'Kimi Cursor Proxy',
    description: 'OpenAI to Anthropic format proxy for Kimi Coding API',
    version: '1.0.0',
    endpoints: {
      chatCompletions: '/v1/chat/completions',
      health: '/health'
    },
    availableModels: [
      'kimi-for-coding',
      'kimi-k2-thinking',
      'kimi-k2-thinking-turbo',
      'kimi-k2.5'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`[Proxy] Server running on http://localhost:${PORT}`);
  console.log(`[Proxy] Ready to proxy requests to Kimi API`);
});
