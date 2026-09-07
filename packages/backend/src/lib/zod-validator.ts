import { ERROR_CODE } from "@drama-me/shared";
import { zValidator } from "@hono/zod-validator";
import type { z } from "zod";
import { AppError } from "./app-error";

// 不绑死 ZodError<T>：校验 hook 的失败类型随 schema 变化，只读 issues 即可
function validationHook(result: {
	success: boolean;
	error?: { issues: { path: PropertyKey[]; message: string }[] };
}) {
	if (result.success) {
		return;
	}

	throw new AppError(ERROR_CODE.VALIDATION_ERROR, 400, "Validation failed", {
		fields: (result.error?.issues ?? []).map((issue) => ({
			path: issue.path.map(String).join("."),
			message: issue.message,
		})),
	});
}

export function jsonValidator<T extends z.ZodType>(schema: T) {
	return zValidator("json", schema, validationHook);
}

export function queryValidator<T extends z.ZodType>(schema: T) {
	return zValidator("query", schema, validationHook);
}

export function paramValidator<T extends z.ZodType>(schema: T) {
	return zValidator("param", schema, validationHook);
}
