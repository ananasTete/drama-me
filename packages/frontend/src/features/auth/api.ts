import { HttpClient } from "@/lib/api";

/** 无 @ 的账号映射到内部邮箱，复用 better-auth 的 email 字段 */
export function toAuthEmail(account: string): string {
	const trimmed = account.trim().toLowerCase();
	if (!trimmed) {
		return trimmed;
	}
	if (trimmed.includes("@")) {
		return trimmed;
	}
	return `${trimmed}@account.drama-me.local`;
}

function authErrorMessage(code: string | undefined): string {
	if (code === "PASSWORD_TOO_SHORT") {
		return "密码至少 6 位";
	}
	if (code === "INVALID_EMAIL") {
		return "账号格式不正确";
	}
	if (code === "INVALID_EMAIL_OR_PASSWORD") {
		return "密码错误";
	}
	return "登录失败，请稍后重试";
}

/** 登录或自动注册：一次请求，由后端判断登录还是注册 */
export async function signInOrSignUp(
	account: string,
	password: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const email = toAuthEmail(account);
	const name = account.trim();

	const res = await HttpClient.api.auth["sign-in-or-up"].$post({
		json: { email, password, name },
	});

	if (res.ok) {
		return { ok: true };
	}

	const body: unknown = await res.json().catch(() => null);
	const code =
		body &&
		typeof body === "object" &&
		"code" in body &&
		typeof body.code === "string"
			? body.code
			: undefined;
	return { ok: false, message: authErrorMessage(code) };
}
