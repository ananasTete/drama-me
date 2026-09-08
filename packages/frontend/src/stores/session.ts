import type { AuthSession } from "@/lib/auth-client";
import { create } from "zustand";

type SessionState = {
	session: AuthSession | null | undefined;
	setSession: (session: AuthSession | null) => void;
};

/** undefined = 尚未恢复会话，null = 已确认未登录，对象 = 已登录。 */
export const useSessionStore = create<SessionState>((set) => ({
	session: undefined,
	setSession: (session) => set({ session }),
}));
