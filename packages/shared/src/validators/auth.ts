import { z } from "zod";

export const SignInOrSignUpBodySchema = z.object({
	email: z.string().email(),
	password: z.string().min(6),
	name: z.string().min(1),
});

export type SignInOrSignUpBody = z.infer<typeof SignInOrSignUpBodySchema>;
