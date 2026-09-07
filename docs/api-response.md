# API 响应规范

业务接口（`/api/canvases`、`/api/me` 等）用 **HTTP 状态码表示大类，JSON 里的 `error.code` 表示具体规则**。不要包一层 `{ code, msg, data }`，也不要永远返回 HTTP 200。

`/api/auth/*` 仍走 better-auth 自己的格式。`/api/health` 保持简单健康检查 JSON。

## 成功

HTTP **2xx**，body 就是业务数据：

```json
{ "canvas": { "id": "...", "name": "未命名画布" } }
```

创建成功用 **201**。分页字段放在资源自己的 JSON 里（如 `total` / `page`），不是全局信封。

## 失败

HTTP **4xx / 5xx**，形状固定：

```json
{
  "error": {
    "code": "CANVAS_NOT_FOUND",
    "message": "Canvas not found",
    "details": {}
  }
}
```

| 字段 | 用途 |
| --- | --- |
| `code` | 稳定英文码，前后端分支、i18n 都用它 |
| `message` | 给开发和日志看，不要当用户文案 |
| `details` | 可选。校验失败可带 `{ fields: [{ path, message }] }` |

前端用 `res.ok` 判断成败；失败后读 `error.code`，用户提示写在前端。

## HTTP 大类怎么选

| HTTP | 何时用 | `code` 示例 |
| --- | --- | --- |
| 400 | 请求形状不对 | `VALIDATION_ERROR` |
| 401 | 未登录 | `UNAUTHORIZED` |
| 403 | 已登录但不允许 | `REAL_NAME_REQUIRED`（以后） |
| 404 | 资源不存在 | `CANVAS_NOT_FOUND` |
| 409 | 和当前状态冲突 | `INSUFFICIENT_STOCK` / `ALREADY_CHECKED_IN`（以后） |
| 422 | 语义合法但业务规则拒绝 | `COUPON_EXPIRED`（以后） |
| 500 | 未预料的服务器错误 | `INTERNAL_ERROR` |

同一 HTTP 可以对应很多 `code`。不要为每条业务规则发明新的 HTTP 状态码。

## 后端怎么写

1. 在 `packages/shared/src/errors.ts` 的 `ERROR_CODE` 里加码。
2. 路由里 `throw new AppError(ERROR_CODE.xxx, 409, "...")`。
3. `app.onError` 会转成上面的 JSON。不要在 handler 里手写 `{ error: ... }`。

校验失败由 `zod-validator` 自动变成 400 + `VALIDATION_ERROR`。未捕获异常变成 500 + `INTERNAL_ERROR`（不把堆栈返回给客户端）。

## 前端怎么写

```ts
const res = await HttpClient.api.canvases.$get({ query });
await throwIfNotOk(res);
return res.json();
```

分支用 `isApiError(error, ERROR_CODE.UNAUTHORIZED)`，不要比对 `error.message`。
