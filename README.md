# Kimi Cursor Proxy

OpenAI 到 Anthropic 格式的转换代理，让 Cursor 能够使用 Kimi 编程套餐 API。

## 背景

- **Cursor** 只支持 OpenAI 格式的 API
- **Kimi 编程套餐** 只接受 Anthropic 格式的请求

本代理服务在两者之间进行格式转换。

## 功能

- 将 OpenAI 格式的请求转换为 Anthropic 格式
- 转发到 Kimi Coding API
- 将响应转换回 OpenAI 格式

## 安装

```bash
npm install
```

## 配置

1. 复制环境变量模板：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入你的 Kimi API Key（从 https://kimi.moonshot.cn 获取）

```env
KIMI_API_KEY=your_kimi_api_key_here
PORT=3000
```

## 运行

```bash
# 启动服务
npm start

# 开发模式（自动重启）
npm run dev
```

## Cursor 配置

在 Cursor 中配置：

| 配置项 | 值 |
|--------|-----|
| Base URL | `http://localhost:3000` |
| API Key | 任意值（或你的 Kimi API Key） |
| 模型 | `kimi-k2.5` |

## 可用模型

- `kimi-for-coding` - 基础编程模型
- `kimi-k2-thinking` - 思维链模型
- `kimi-k2-thinking-turbo` - 快速思维链模型
- `kimi-k2.5` - 最新 K2.5 模型（推荐）

## API 端点

- `POST /v1/chat/completions` - OpenAI 兼容的聊天接口
- `GET /health` - 健康检查
- `GET /` - 服务信息

## License

MIT
