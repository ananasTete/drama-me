import type { AppType } from "@drama-me/backend/src/app";
import { ErrorResponseSchema } from "@drama-me/shared";
import { hc } from "hono/client";

export const HttpClient = hc<AppType>("", {
	fetch: (input: RequestInfo | URL, init?: RequestInit) =>
		fetch(input, {
			...init,
			credentials: "include",
		}),
});

/** 业务 API 失败：用 code 做分支，不要比对 message。 */
export class ApiError extends Error {
	readonly code: string;
	readonly status: number;
	readonly details: unknown;

	constructor(
		code: string,
		message: string,
		status: number,
		details?: unknown,
	) {
		super(message);
		this.name = "ApiError";
		this.code = code;
		this.status = status;
		this.details = details;
	}
}

export function isApiError(error: unknown, code?: string): error is ApiError {
	if (!(error instanceof ApiError)) {
		return false;
	}
	return code === undefined || error.code === code;
}

/** 非 2xx 时抛出 ApiError，成功则原样返回。 */
export async function throwIfNotOk(res: Response): Promise<void> {
	if (res.ok) {
		return;
	}

	const body: unknown = await res.json().catch(() => null);
	const parsed = ErrorResponseSchema.safeParse(body);
	if (parsed.success) {
		throw new ApiError(
			parsed.data.error.code,
			parsed.data.error.message,
			res.status,
			parsed.data.error.details,
		);
	}

	throw new ApiError("REQUEST_FAILED", "Request failed", res.status);
}
