import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    jwt: async (params) => {
      const token = await authConfig.callbacks!.jwt!(params);
      if (params.trigger === "update") {
        const employee = await prisma.employee.findUnique({ where: { id: token.employeeId as string } });
        if (employee) {
          token.role = employee.role;
          token.mustChangePassword = employee.mustChangePassword;
        }
      }
      return token;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const employee = await prisma.employee.findUnique({
          where: { email: email.toLowerCase().trim() },
        });
        if (!employee || !employee.active) return null;

        const valid = await verifyPassword(password, employee.passwordHash);
        if (!valid) return null;

        return {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: employee.role,
          mustChangePassword: employee.mustChangePassword,
        };
      },
    }),
    Credentials({
      id: "mock",
      name: "Quick login",
      credentials: {
        employeeId: { label: "Employee", type: "text" },
      },
      authorize: async (credentials) => {
        const employeeId = credentials?.employeeId as string | undefined;
        if (!employeeId) return null;

        const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
        if (!employee || !employee.active) return null;

        return {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: employee.role,
          // Quick logins skip the forced password reset so the one-click flow
          // actually lands on the dashboard immediately.
          mustChangePassword: false,
        };
      },
    }),
  ],
});
