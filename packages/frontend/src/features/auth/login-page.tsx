import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSearch } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";
import { useSignIn } from "./hooks";

function LoginPage() {
	const search = useSearch({ from: "/login" });
	const [account, setAccount] = useState("");
	const [password, setPassword] = useState("");
	const signInMutation = useSignIn(search.redirect);

	function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		signInMutation.mutate({ account, password });
	}

	const errorMessage =
		signInMutation.error instanceof Error ? signInMutation.error.message : null;

	return (
		<div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
			<Card>
				<CardHeader>
					<h2 className="text-lg font-semibold">登录</h2>
					<p className="text-sm text-muted-foreground">
						使用账号和密码登录；账号不存在时会自动注册
					</p>
				</CardHeader>
				<CardContent>
					<form className="space-y-3" onSubmit={onSubmit}>
						<Input
							value={account}
							onChange={(event) => setAccount(event.target.value)}
							placeholder="账号"
							name="account"
							autoComplete="username"
							required
						/>
						<Input
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							placeholder="密码（至少 6 位）"
							name="password"
							autoComplete="current-password"
							minLength={6}
							required
						/>
						<Button
							type="submit"
							className="w-full"
							disabled={
								signInMutation.isPending || !account.trim() || !password
							}
						>
							{signInMutation.isPending ? "登录中..." : "登录"}
						</Button>
					</form>
					{errorMessage && (
						<p className="mt-3 text-sm text-destructive">{errorMessage}</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

export default LoginPage;
