import { triggerWorkflow } from "./controllers/workflow.controller.ts";
import { WorkflowType } from "./controllers/cron.ts";
import { ConfigManager } from "@src/utils/config/config-manager.ts";
import { ConfigService } from "@src/services/config.service.ts";
import { ArticleLogService } from "@src/services/article-log.service.ts";

export interface JSONRPCRequest {
  jsonrpc: string;
  method: string;
  params: Record<string, any>;
  id: string | number;
}

export interface JSONRPCResponse {
  jsonrpc: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number;
}

export class JSONRPCServer {
  private routes: Record<string, (params: Record<string, any>) => Promise<any>>;

  constructor() {
    this.routes = {};
  }


  registerRoute(method: string, handler: (params: Record<string, any>) => Promise<any>) {
    this.routes[method] = handler;
  }

  async handleRequest(request: Request): Promise<Response> {
    try {
      if (request.method !== "POST") {
        throw new Error("只支持 POST 请求");
      }

      const body = await request.json() as JSONRPCRequest;

      if (!body.jsonrpc || body.jsonrpc !== "2.0") {
        throw new Error("无效的 JSON-RPC 请求");
      }

      if (!body.method) {
        throw new Error("请求缺少方法名");
      }

      const handler = this.routes[body.method];
      if (!handler) {
        throw new Error(`方法 ${body.method} 不存在`);
      }

      const result = await handler(body.params || {});
      
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          result,
          id: body.id,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      const isClientError = error instanceof Error && (
        error.message.includes("无效的") ||
        error.message.includes("不存在") ||
        error.message.includes("缺少")
      );

      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: isClientError ? -32600 : -32603,
            message: isClientError ? error.message : "内部服务器错误",
            data: {
              error: error instanceof Error ? error.message : String(error),
            },
          },
          id: "unknown",
        }),
        {
          status: isClientError ? 400 : 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  }
}

// 创建 JSON-RPC 服务器实例
const rpcServer = new JSONRPCServer();
rpcServer.registerRoute("triggerWorkflow", triggerWorkflow);

// 简单的 HTML 管理页面内容（内嵌，避免额外静态服务器）
const adminHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>TrendPublish 控制台</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    :root {
      --bg: #020617;
      --bg-elevated: #020617;
      --card-bg: rgba(15,23,42,0.95);
      --border-subtle: rgba(148,163,184,0.3);
      --accent: #38bdf8;
      --accent-soft: rgba(56,189,248,0.15);
      --accent-strong: #0ea5e9;
      --accent-secondary: #a855f7;
      --text: #e5e7eb;
      --text-soft: #9ca3af;
      --danger: #f97373;
      --success: #4ade80;
    }
    * { box-sizing:border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at 0 0, rgba(56,189,248,0.25), transparent 55%),
        radial-gradient(circle at 100% 0, rgba(168,85,247,0.25), transparent 55%),
        radial-gradient(circle at 50% 100%, rgba(34,197,94,0.2), transparent 55%),
        var(--bg);
      color: var(--text);
      padding: 32px 24px 48px;
    }
    .shell {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:16px;
      margin-bottom:24px;
    }
    .title-block h1 {
      font-size: 28px;
      margin: 0 0 4px;
      display:flex;
      align-items:center;
      gap:8px;
    }
    .title-pill {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .12em;
      padding: 2px 8px;
      border-radius:999px;
      border:1px solid rgba(148,163,184,0.4);
      color: var(--text-soft);
    }
    .subtitle {
      font-size: 13px;
      color: var(--text-soft);
      margin: 0;
    }
    .badge-live {
      display:inline-flex;
      align-items:center;
      gap:6px;
      font-size:11px;
      padding:4px 8px;
      border-radius:999px;
      background:rgba(22,163,74,0.12);
      color: var(--success);
      border:1px solid rgba(22,163,74,0.45);
    }
    .dot {
      width:8px;height:8px;
      border-radius:50%;
      background:radial-gradient(circle at 30% 30%, #bbf7d0, #22c55e);
      box-shadow:0 0 10px rgba(34,197,94,.9);
    }
    .grid {
      display:grid;
      grid-template-columns: minmax(0,2fr) minmax(0,3fr);
      gap:20px;
      margin-bottom:20px;
    }
    @media (max-width: 900px) {
      .grid { grid-template-columns: minmax(0,1fr); }
      .header { flex-direction:column; align-items:flex-start; }
    }
    .card {
      background: radial-gradient(circle at 0 0, rgba(56,189,248,0.12), transparent 55%), var(--card-bg);
      border-radius:18px;
      padding:18px 18px 16px;
      border:1px solid var(--border-subtle);
      box-shadow:0 18px 45px rgba(15,23,42,0.9);
      position:relative;
      overflow:hidden;
    }
    .card::before {
      content:"";
      position:absolute;
      inset:0;
      background:radial-gradient(circle at 120% -20%, rgba(56,189,248,0.16), transparent 50%);
      opacity:.6;
      pointer-events:none;
    }
    .card-header {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:8px;
      margin-bottom:8px;
      position:relative;
      z-index:1;
    }
    .card-title {
      font-size:15px;
      font-weight:600;
      display:flex;
      align-items:center;
      gap:8px;
    }
    .card-title span.icon {
      width:22px;height:22px;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      background:radial-gradient(circle at 30% 0%, #38bdf8, #0f172a);
      color:#e0f2fe;
      font-size:13px;
      box-shadow:0 0 18px rgba(56,189,248,0.6);
    }
    .card-subtitle {
      font-size:12px;
      color:var(--text-soft);
      margin:0 0 8px;
      position:relative;
      z-index:1;
    }
    label {
      display:block;
      margin:8px 0 4px;
      font-weight:500;
      font-size:12px;
      color:var(--text-soft);
    }
    input, select {
      width:100%;
      padding:8px 10px;
      border-radius:8px;
      border:1px solid rgba(148,163,184,0.45);
      background:rgba(15,23,42,0.9);
      color:var(--text);
      font-size:13px;
      outline:none;
      backdrop-filter: blur(10px);
    }
    input::placeholder { color:#6b7280; }
    input:focus, select:focus {
      border-color:var(--accent);
      box-shadow:0 0 0 1px rgba(56,189,248,0.4);
    }
    button {
      margin-top:10px;
      padding:7px 14px;
      border-radius:999px;
      border:none;
      background:linear-gradient(135deg, var(--accent), var(--accent-secondary));
      color:#f9fafb;
      cursor:pointer;
      font-size:12px;
      font-weight:500;
      display:inline-flex;
      align-items:center;
      gap:6px;
      position:relative;
      z-index:1;
    }
    button span.chevron {
      font-size:10px;
      opacity:.9;
    }
    button:disabled { opacity:0.6; cursor:not-allowed; }
    .row {
      display:flex;
      gap:8px;
      align-items:flex-end;
      position:relative;
      z-index:1;
    }
    .row > * { flex:1; }
    .msg {
      margin-top:6px;
      font-size:11px;
      color:var(--text-soft);
      position:relative;
      z-index:1;
    }
    .msg.ok { color:var(--success); }
    .msg.err { color:var(--danger); }
    small { color:var(--text-soft); font-size:11px; position:relative; z-index:1; }
    .pill {
      font-size:10px;
      padding:2px 7px;
      border-radius:999px;
      border:1px solid rgba(148,163,184,0.45);
      color:var(--text-soft);
    }
    .articles-card {
      margin-top:8px;
    }
    .articles-list {
      margin-top:4px;
      max-height:340px;
      overflow:auto;
      padding-right:4px;
    }
    .article-item {
      padding:10px 10px;
      border-radius:10px;
      border:1px solid rgba(30,64,175,0.4);
      background:linear-gradient(135deg, rgba(15,23,42,0.9), rgba(15,23,42,0.6));
      display:flex;
      flex-direction:column;
      gap:4px;
      margin-bottom:8px;
    }
    .article-header {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:8px;
      font-size:13px;
    }
    .article-title {
      font-weight:500;
      color:#e5e7eb;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
    }
    .article-meta {
      display:flex;
      align-items:center;
      gap:8px;
      font-size:11px;
      color:var(--text-soft);
    }
    .wf-badge {
      font-size:10px;
      padding:2px 6px;
      border-radius:999px;
      background:rgba(56,189,248,0.12);
      color:#bae6fd;
      border:1px solid rgba(56,189,248,0.45);
    }
    .article-footer {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:8px;
      font-size:11px;
      color:var(--text-soft);
    }
    .link {
      color:var(--accent);
      text-decoration:none;
      font-size:11px;
    }
    .link:hover { text-decoration:underline; }
    .empty {
      font-size:11px;
      color:var(--text-soft);
      padding:10px 6px 6px;
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="header">
      <div class="title-block">
        <div class="title-pill">TrendPublish · 控制台</div>
        <h1>
          智能文章调度中心
        </h1>
        <p class="subtitle">配置定时发布规则，查看最近发布的文章，一切尽在浏览器中完成。</p>
      </div>
      <div class="badge-live">
        <span class="dot"></span>
        <span>实时连接中</span>
      </div>
    </div>

    <div class="card" style="margin-bottom:18px;">
      <div class="card-header">
        <div class="card-title">
          <span class="icon">🔐</span>
          访问凭证
        </div>
        <span class="pill">本地保存 · 不上传服务器</span>
      </div>
      <p class="card-subtitle">在本机浏览器中保存 SERVER_API_KEY，用于调用受保护的管理接口。</p>
      <label>API Key（SERVER_API_KEY）</label>
      <input id="apiKey" type="password" placeholder="用于调用后端管理接口，不会上传到服务器，只保存在本地浏览器" />
      <button id="saveKey">
        保存到本地浏览器 <span class="chevron">›</span>
      </button>
      <div class="msg" id="keyMsg"></div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <span class="icon">⏱</span>
          定时发布时间
        </div>
        <span class="pill">每天固定时间</span>
      </div>
      <p class="card-subtitle">配置每天自动发布「每日 AI 速递」的时间（北京时间）。</p>
      <div class="row">
        <div>
          <label for="cronHour">小时 (0-23)</label>
          <input id="cronHour" type="number" min="0" max="23" />
        </div>
        <div>
          <label for="cronMinute">分钟 (0-59)</label>
          <input id="cronMinute" type="number" min="0" max="59" />
        </div>
      </div>
      <small>当前支持「每天固定时间」这一种形式，对应 cron 表达式：<code>m h * * *</code>。</small>
      <button id="saveCron">
        保存定时配置 <span class="chevron">›</span>
      </button>
      <div class="msg" id="cronMsg"></div>
    </div>

    <div class="card articles-card">
      <div class="card-header">
        <div class="card-title">
          <span class="icon">📰</span>
          最近发布的文章
        </div>
        <span class="pill" id="articlesCountLabel">加载中...</span>
      </div>
      <p class="card-subtitle">查看系统最近发布到微信公众号的文章记录，便于快速回溯与检查。</p>
      <div class="articles-list" id="articlesList">
        <div class="empty">正在加载最近发布记录...</div>
      </div>
    </div>

    <div class="card articles-card" style="margin-top:18px;">
      <div class="card-header">
        <div class="card-title">
          <span class="icon">⚡</span>
          手动触发工作流
        </div>
        <span class="pill">立即执行一次「每日 AI 速递」</span>
      </div>
      <p class="card-subtitle">在不等待定时任务的情况下，立即执行一次每日 AI 速递工作流，适合调试或临时发布。</p>
      <div class="row">
        <button id="runArticle">
          运行「每日 AI 速递」 <span class="chevron">›</span>
        </button>
      </div>
      <div class="msg" id="runMsg"></div>
    </div>
  </div>

  <script>
    const WEEK_DAYS = [
      { value: 1, label: "周一" },
      { value: 2, label: "周二" },
      { value: 3, label: "周三" },
      { value: 4, label: "周四" },
      { value: 5, label: "周五" },
      { value: 6, label: "周六" },
      { value: 7, label: "周日" }
    ];

    const apiKeyInput = document.getElementById("apiKey");
    const keyMsg = document.getElementById("keyMsg");
    const saveKeyBtn = document.getElementById("saveKey");

    function getApiKey() {
      return localStorage.getItem("tp_api_key") || "";
    }
    function setApiKey(v) {
      localStorage.setItem("tp_api_key", v);
    }

    apiKeyInput.value = getApiKey();

    saveKeyBtn.onclick = () => {
      setApiKey(apiKeyInput.value.trim());
      keyMsg.textContent = "已保存到本地浏览器";
      keyMsg.className = "msg ok";
    };

    function authHeaders() {
      const key = getApiKey();
      return key
        ? { "Authorization": "Bearer " + key, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" };
    }

    async function api(path, options) {
      const res = await fetch(path, {
        ...options,
        headers: { ...(options && options.headers ? options.headers : {}), ...authHeaders() },
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error("HTTP " + res.status + ": " + txt);
      }
      return res.json();
    }

    const cronHour = document.getElementById("cronHour");
    const cronMinute = document.getElementById("cronMinute");
    const cronMsg = document.getElementById("cronMsg");
    const saveCronBtn = document.getElementById("saveCron");

    const articlesList = document.getElementById("articlesList");
    const articlesCountLabel = document.getElementById("articlesCountLabel");

    const runArticleBtn = document.getElementById("runArticle");
    const runMsg = document.getElementById("runMsg");

    async function loadConfig() {
      try {
        const data = await api("/admin/config", { method: "GET" });
        if (data.cronExpression) {
          const parts = data.cronExpression.split(" ");
          if (parts.length >= 2) {
            cronMinute.value = parts[0];
            cronHour.value = parts[1];
          }
        }
        if (data.dailyWorkflows) {
          Object.entries(data.dailyWorkflows).forEach(([day, val]) => {
            const sel = document.getElementById("wf_" + day);
            if (sel && typeof val === "string") sel.value = val;
          });
        }
      } catch (e) {
        console.error(e);
      }
    }

    function renderArticles(items) {
      if (!Array.isArray(items) || items.length === 0) {
        articlesList.innerHTML = '<div class="empty">暂时还没有发布记录，等待首次自动发布或手动触发工作流后再来看。</div>';
        articlesCountLabel.textContent = "0 条记录";
        return;
      }
      articlesCountLabel.textContent = items.length + " 条记录";
      articlesList.innerHTML = "";
      items.forEach((item) => {
        const el = document.createElement("div");
        el.className = "article-item";
        const wfLabel = item.workflowType || "unknown";
        const ts = item.publishedAt
          ? new Date(item.publishedAt).toLocaleString()
          : "";
        el.innerHTML = [
          '<div class="article-header">',
          '  <div class="article-title" title="' + (item.title || "") + '">',
          '    ' + (item.title || "未命名文章"),
          "  </div>",
          '  <div class="wf-badge">' + wfLabel + "</div>",
          "</div>",
          '<div class="article-footer">',
          '  <span>' + ts + "</span>",
          '  <a class="link" href="' + (item.url || "#") + '" target="_blank" rel="noopener noreferrer">在公众号中查看</a>',
          "</div>",
        ].join("");
        articlesList.appendChild(el);
      });
    }

    async function loadArticles() {
      try {
        const data = await api("/admin/articles", { method: "GET" });
        renderArticles(data.items || []);
      } catch (e) {
        console.error(e);
        articlesList.innerHTML = '<div class="empty">加载文章记录失败：' + e.message + "</div>";
        articlesCountLabel.textContent = "加载失败";
      }
    }

    saveCronBtn.onclick = async () => {
      const h = parseInt(cronHour.value, 10);
      const m = parseInt(cronMinute.value, 10);
      if (Number.isNaN(h) || h < 0 || h > 23 || Number.isNaN(m) || m < 0 || m > 59) {
        cronMsg.textContent = "请输入正确的小时(0-23)与分钟(0-59)";
        cronMsg.className = "msg err";
        return;
      }
      const expr = m + " " + h + " * * *";
      try {
        await api("/admin/config/cron", {
          method: "POST",
          body: JSON.stringify({ cronExpression: expr }),
        });
        cronMsg.textContent = "已保存：" + expr + "（重启服务后生效）";
        cronMsg.className = "msg ok";
      } catch (e) {
        cronMsg.textContent = "保存失败：" + e.message;
        cronMsg.className = "msg err";
      }
    };

    async function triggerWorkflow(workflowType, labelEl) {
      try {
        runMsg.textContent = "正在触发工作流：" + workflowType + " ...";
        runMsg.className = "msg";
        labelEl.disabled = true;
        await api("/admin/trigger", {
          method: "POST",
          body: JSON.stringify({ workflowType }),
        });
        runMsg.textContent = "触发成功，具体执行进度请查看 Bark 通知或服务器日志。";
        runMsg.className = "msg ok";
      } catch (e) {
        runMsg.textContent = "触发失败：" + e.message;
        runMsg.className = "msg err";
      } finally {
        labelEl.disabled = false;
        // 触发后稍等一会再刷新列表
        setTimeout(loadArticles, 15000);
      }
    }

    runArticleBtn.onclick = () =>
      triggerWorkflow("weixin-article-workflow", runArticleBtn);

    loadConfig();
    loadArticles();
  </script>
</body>
</html>`;

// 请求处理器
const handler = async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const normalizedPath = url.pathname.replace(/^\/+|\/+$/g, "");

    // 管理后台页面（不要求鉴权，只是个静态 HTML）
    if (normalizedPath === "admin" || normalizedPath === "admin/") {
      return new Response(adminHtml, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    // 下面的接口都需要 Bearer 鉴权
    const configManager = ConfigManager.getInstance();
    const API_KEY = await configManager.get("SERVER_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ") ||
      authHeader.split(" ")[1] !== API_KEY) {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "未授权的访问",
            data: {
              error: "缺少有效的 Authorization 请求头",
            },
          },
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    // JSON-RPC 工作流接口
    if (normalizedPath === "api/workflow") {
      return await rpcServer.handleRequest(req);
    }

    // 配置读取
    if (normalizedPath === "admin/config" && req.method === "GET") {
      const cronExpression =
        (await ConfigService.get("CRON_EXPRESSION")) ?? "0 3 * * *";
      const dailyWorkflows: Record<string, string | null> = {};
      for (let day = 1 as 1; day <= 7; day++) {
        const key = `${day}_of_week_workflow`;
        dailyWorkflows[String(day)] = await ConfigService.get(key);
      }
      return new Response(
        JSON.stringify({ cronExpression, dailyWorkflows }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // 最近发布的文章
    if (normalizedPath === "admin/articles" && req.method === "GET") {
      const items = await ArticleLogService.getRecentArticles(20);
      return new Response(JSON.stringify({ items }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 更新 cron 表达式
    if (normalizedPath === "admin/config/cron" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const expr = typeof body.cronExpression === "string"
        ? body.cronExpression.trim()
        : "";
      if (!expr) {
        return new Response(
          JSON.stringify({ error: "缺少 cronExpression" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      await ConfigService.set("CRON_EXPRESSION", expr);
      return new Response(
        JSON.stringify({ ok: true, cronExpression: expr }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // 更新每周工作流配置
    if (
      normalizedPath === "admin/config/daily-workflows" &&
      req.method === "POST"
    ) {
      const body = await req.json().catch(() => ({}));
      const daily = body.dailyWorkflows || {};
      for (let day = 1 as 1; day <= 7; day++) {
        const key = `${day}_of_week_workflow`;
        const val = daily[String(day)];
        if (typeof val === "string" && val.trim()) {
          await ConfigService.set(key, val.trim());
        }
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 手动触发工作流
    if (normalizedPath === "admin/trigger" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const workflowType = body.workflowType;
      if (!workflowType) {
        return new Response(
          JSON.stringify({ error: "缺少 workflowType" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // 复用 JSON-RPC 控制器逻辑
      await triggerWorkflow({ workflowType });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 处理其他请求
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32601,
          message: "无效的API路径",
          data: {
            path: normalizedPath,
            expectedPath: "api/workflow 或 admin/*",
          },
        },
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("请求处理错误:", error);
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "服务器内部错误",
          data: {
            error: error instanceof Error ? error.message : String(error),
          },
        },
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
};

export default function startServer(port = 8000) {
  Deno.serve({ port }, handler);
  console.log(`JSON-RPC 服务器运行在 http://localhost:${port}`);
  console.log("支持的方法:");
  console.log("- triggerWorkflow");
  console.log(`可用的工作流类型: ${Object.values(WorkflowType).join(", ")}`);
}
