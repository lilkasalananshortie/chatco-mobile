import { appStorage } from "../storage/app-storage";
import { CONDUCTOR_DEVICE_TYPE, getConductorDeviceId } from "../storage/device-id";
import type { User } from "../domain/types";
import {
  CACHED_USER_KEY,
  NetworkError,
  post,
  request,
  resetSessionEndedNotified,
  TOKEN_KEY,
} from "./api-client";

export const authService = {
  async login(login: string, password: string): Promise<User> {
    const deviceId = await getConductorDeviceId();
    const data = await request<any>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        login,
        password,
        device_id: deviceId,
        device_type: CONDUCTOR_DEVICE_TYPE,
      }),
    });
    if (data.role !== "CONDUCTOR") throw new Error("This app is restricted to Conductor accounts.");
    const user: User = { id: String(data.id), email: data.email, role: data.role, name: data.name };
    await appStorage.setItem(CACHED_USER_KEY, JSON.stringify(user)).catch(() => null);
    await appStorage.setItem(TOKEN_KEY, data.token);
    resetSessionEndedNotified();
    return user;
  },

  async logout(): Promise<void> {
    try {
      await post("/auth/logout");
    } finally {
      await appStorage.removeItem(TOKEN_KEY);
    }
  },

  async forgotPassword(email: string) {
    return post("/auth/forgot-password", { email });
  },

  async verifyResetCode(email: string, code: string) {
    return post("/auth/verify-reset-code", { email, code });
  },

  async resetPassword(input: {
    email: string;
    code: string;
    password: string;
    passwordConfirmation: string;
  }) {
    return post("/auth/reset-password", {
      email: input.email,
      code: input.code,
      password: input.password,
      password_confirmation: input.passwordConfirmation,
    });
  },

  async me(): Promise<User | null> {
    if (!(await appStorage.getItem(TOKEN_KEY))) return null;
    try {
      const data = await request<any>("/user");
      const u = data.user ?? data;
      if (u.role !== "CONDUCTOR") return null;
      const user: User = { id: String(u.id), email: u.email, role: u.role, name: u.name ?? u.email };
      await appStorage.setItem(CACHED_USER_KEY, JSON.stringify(user)).catch(() => null);
      return user;
    } catch (cause) {
      if (cause instanceof NetworkError) {
        const cached = await appStorage.getItem(CACHED_USER_KEY);
        if (cached) {
          try {
            return JSON.parse(cached) as User;
          } catch {}
        }
      }
      return null;
    }
  },
};
