import { z } from "zod";

/**
 * 稳定错误码：前后端用同一份常量做分支，不要比对 message 文案。
 * 新增业务错误时先在这里加码，再在后端 throw AppError。
 */
export const ERROR_CODE = {
	UNAUTHORIZED: "UNAUTHORIZED",
	VALIDATION_ERROR: "VALIDATION_ERROR",
	CANVAS_NOT_FOUND: "CANVAS_NOT_FOUND",
	INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

/** 失败响应的固定形状。code 用 string，避免新码尚未发前端时解析失败。 */
export const ErrorResponseSchema = z.object({
	error: z.object({
		code: z.string().min(1),
		message: z.string(),
		details: z.unknown().optional(),
	}),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export function toErrorResponse(
	code: string,
	message: string,
	details?: unknown,
): ErrorResponse {
	return ErrorResponseSchema.parse({
		error: {
			code,
			message,
			...(details === undefined ? {} : { details }),
		},
	});
}
