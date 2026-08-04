import { Hono } from "hono";
import { auth } from "../lib/auth";

// better-auth 的所有认证端点都挂载到 /api/auth/*
// 包括：手机号发送/验证验证码、Google 登录回调、获取/刷新 session、登出等
// 这里只做「透传」：把 Hono 收到的原始请求交给 better-auth handler 处理，返回其 Response
const authRoute = new Hono();

authRoute.on(["POST", "GET"], "/*", (c) => auth.handler(c.req.raw));

export { authRoute };
