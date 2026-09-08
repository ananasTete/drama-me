import { createAuthClient } from "better-auth/react";

// 与后端 /api/auth/* 同源（Vite proxy），Cookie 自动随请求发送。
export const authClient = createAuthClient({
	baseURL: "",
});

export type AuthSession = typeof authClient.$Infer.Session;
