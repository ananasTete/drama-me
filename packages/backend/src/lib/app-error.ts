import { ERROR_CODE, toErrorResponse } from "@drama-me/shared";
import type { ErrorHandler } from "hono";

/** 规范里会用到的 HTTP 大类，业务细分走 error.code */
export type AppErrorStatus = 400 | 401 | 403 | 404 | 409 | 422 | 500;

/**
 * 业务/协议错误：抛出后由 handleError 转成统一 JSON。
 * 路由里不要手写 c.json({ error: ... })。
 */
export class AppError extends Error {
	readonly code: string;
	readonly status: AppErrorStatus;
	readonly details: unknown;

	constructor(
		code: string,
		status: AppErrorStatus,
		message: string,
		details?: unknown,
	) {
		super(message);
		this.name = "AppError";
		this.code = code;
		this.status = status;
		this.details = details;
	}
}

export const handleError: ErrorHandler = (err, c) => {
	if (err instanceof AppError) {
		return c.json(
			toErrorResponse(err.code, err.message, err.details),
			err.status,
		);
	}

	// 未预料的异常：只给客户端通用码，细节打日志
	console.error(err);
	return c.json(
		toErrorResponse(ERROR_CODE.INTERNAL_ERROR, "Internal Server Error"),
		500,
	);
};
