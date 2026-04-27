import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ── 1. Mock 依赖模块（必须在 import authRouter 之前） ──
vi.mock("./lib/env", () => ({
  env: {
    appId: "test-app-id",
    appSecret: "test-secret-must-be-at-least-32-char-long",
    isProduction: false,
    databaseUrl: "mysql://test:test@localhost:3306/test",
    kimiAuthUrl: "https://auth.test",
    kimiOpenUrl: "https://open.test",
    ownerUnionId: "owner_union_id",
  },
}));

vi.mock("./kimi/session", () => ({
  signSessionToken: vi.fn(),
}));

vi.mock("./queries/users", () => ({
  findUserByUnionId: vi.fn(),
  findUserByUsername: vi.fn(),
  upsertUser: vi.fn(),
}));

vi.mock("./lib/password", () => ({
  verifyPassword: vi.fn(),
}));

// ── 2. 导入被测模块与 mock ──
import { authRouter } from "./auth-router";
import { signSessionToken } from "./kimi/session";
import {
  findUserByUnionId,
  findUserByUsername,
  upsertUser,
} from "./queries/users";
import { verifyPassword } from "./lib/password";
import { env } from "./lib/env";
import type { User } from "@db/schema";

// ── 3. 辅助函数 ──
function mockContext(user?: Partial<User> & { unionId?: string }) {
  const baseUser: User | undefined = user
    ? ({
        id: 1,
        unionId: user.unionId ?? "test-union-id",
        username: null,
        password: null,
        name: "Test User",
        email: null,
        avatar: null,
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignInAt: new Date(),
        ...user,
      } as User)
    : undefined;

  return {
    req: new Request("http://localhost:3000/api/trpc", {
      headers: { host: "localhost:3000" },
    }),
    resHeaders: new Headers(),
    user: baseUser,
  };
}

function getSetCookie(headers: Headers): string {
  return headers.get("set-cookie") ?? "";
}

describe("auth-router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.isProduction = false;
  });

  afterEach(() => {
    env.isProduction = false;
  });

  // ─────────────────────────────────────────────
  // me
  // ─────────────────────────────────────────────
  describe("me", () => {
    it("returns null when not authenticated", async () => {
      const caller = authRouter.createCaller(mockContext());
      const result = await caller.me();
      expect(result).toBeNull();
    });

    it("returns the current user when authenticated", async () => {
      const user = mockContext({ id: 7, name: "Alice", unionId: "u-123" });
      const caller = authRouter.createCaller(user);
      const result = await caller.me();
      expect(result).toEqual(user.user);
    });
  });

  // ─────────────────────────────────────────────
  // logout
  // ─────────────────────────────────────────────
  describe("logout", () => {
    it("clears the session cookie and returns success", async () => {
      const ctx = mockContext({ id: 1, unionId: "u-1" });
      const caller = authRouter.createCaller(ctx);
      const result = await caller.logout();

      expect(result).toEqual({ success: true });

      const setCookie = getSetCookie(ctx.resHeaders);
      expect(setCookie).toContain("kimi_sid=");
      expect(setCookie).toContain("Max-Age=0");
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie).toContain("Path=/");
    });
  });

  // ─────────────────────────────────────────────
  // demoLogin
  // ─────────────────────────────────────────────
  describe("demoLogin", () => {
    it("creates demo user and sets session cookie in non-production", async () => {
      const demoUser: User = {
        id: 99,
        unionId: "demo-user-abcdef",
        username: null,
        password: null,
        name: "演示用户",
        email: null,
        avatar: null,
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignInAt: new Date(),
      };

      vi.mocked(upsertUser).mockResolvedValue(undefined);
      vi.mocked(findUserByUnionId).mockResolvedValue(demoUser);
      vi.mocked(signSessionToken).mockResolvedValue("demo-jwt-token");

      const ctx = mockContext();
      const caller = authRouter.createCaller(ctx);
      const result = await caller.demoLogin();

      expect(upsertUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "演示用户",
          lastSignInAt: expect.any(Date),
        }),
      );
      expect(findUserByUnionId).toHaveBeenCalled();
      expect(signSessionToken).toHaveBeenCalledWith(
        expect.objectContaining({
          unionId: expect.stringMatching(/^demo-user-/),
          clientId: "test-app-id",
        }),
      );
      expect(result).toEqual({ success: true, user: demoUser });

      const setCookie = getSetCookie(ctx.resHeaders);
      expect(setCookie).toContain("kimi_sid=demo-jwt-token");
      expect(setCookie).toContain("Max-Age=604800"); // 7 days
    });

    it("throws FORBIDDEN in production", async () => {
      env.isProduction = true;
      const caller = authRouter.createCaller(mockContext());
      await expect(caller.demoLogin()).rejects.toBeInstanceOf(TRPCError);
      await expect(caller.demoLogin()).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Demo login disabled in production",
      });
    });

    it("throws internal error when demo user creation fails", async () => {
      vi.mocked(upsertUser).mockResolvedValue(undefined);
      vi.mocked(findUserByUnionId).mockResolvedValue(undefined);

      const caller = authRouter.createCaller(mockContext());
      await expect(caller.demoLogin()).rejects.toThrow(
        "Failed to create demo user session",
      );
    });
  });

  // ─────────────────────────────────────────────
  // localLogin
  // ─────────────────────────────────────────────
  describe("localLogin", () => {
    const mockUser: User = {
      id: 42,
      unionId: "local-u-42",
      username: "devuser",
      password: "hashed_password_here",
      name: "Dev User",
      email: null,
      avatar: null,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignInAt: new Date(),
    };

    it("succeeds with valid credentials", async () => {
      vi.mocked(findUserByUsername).mockResolvedValue(mockUser);
      vi.mocked(verifyPassword).mockResolvedValue(true);
      vi.mocked(signSessionToken).mockResolvedValue("local-jwt-token");

      const ctx = mockContext();
      const caller = authRouter.createCaller(ctx);
      const result = await caller.localLogin({
        username: "devuser",
        password: "correct-password",
      });

      expect(findUserByUsername).toHaveBeenCalledWith("devuser");
      expect(verifyPassword).toHaveBeenCalledWith(
        "correct-password",
        "hashed_password_here",
      );
      expect(signSessionToken).toHaveBeenCalledWith({
        unionId: "local-u-42",
        clientId: "test-app-id",
      });
      expect(result).toEqual({ success: true, user: mockUser });

      const setCookie = getSetCookie(ctx.resHeaders);
      expect(setCookie).toContain("kimi_sid=local-jwt-token");
    });

    it("throws UNAUTHORIZED when user not found", async () => {
      vi.mocked(findUserByUsername).mockResolvedValue(undefined);

      const caller = authRouter.createCaller(mockContext());
      await expect(
        caller.localLogin({ username: "nobody", password: "any" }),
      ).rejects.toBeInstanceOf(TRPCError);
      await expect(
        caller.localLogin({ username: "nobody", password: "any" }),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "Invalid username or password",
      });
    });

    it("throws UNAUTHORIZED when user has no password", async () => {
      vi.mocked(findUserByUsername).mockResolvedValue({
        ...mockUser,
        password: null,
      });

      const caller = authRouter.createCaller(mockContext());
      await expect(
        caller.localLogin({ username: "devuser", password: "any" }),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "Invalid username or password",
      });
    });

    it("throws UNAUTHORIZED when password is wrong", async () => {
      vi.mocked(findUserByUsername).mockResolvedValue(mockUser);
      vi.mocked(verifyPassword).mockResolvedValue(false);

      const caller = authRouter.createCaller(mockContext());
      await expect(
        caller.localLogin({ username: "devuser", password: "wrong" }),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "Invalid username or password",
      });
    });

    it("throws FORBIDDEN in production", async () => {
      env.isProduction = true;
      const caller = authRouter.createCaller(mockContext());
      await expect(
        caller.localLogin({ username: "devuser", password: "any" }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Local login disabled in production",
      });
    });

    it("rejects input schema violations", async () => {
      const caller = authRouter.createCaller(mockContext());
      // @ts-expect-error testing invalid input
      await expect(caller.localLogin({})).rejects.toBeInstanceOf(TRPCError);
    });
  });
});
