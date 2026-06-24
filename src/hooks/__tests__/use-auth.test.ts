import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";
import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAnonWorkData as any).mockReturnValue(null);
    (getProjects as any).mockResolvedValue([]);
  });

  test("starts with isLoading false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  describe("signIn", () => {
    test("sets isLoading while in flight and resets after completion", async () => {
      let resolveSignIn: (value: any) => void;
      (signInAction as any).mockReturnValue(
        new Promise((resolve) => {
          resolveSignIn = resolve;
        })
      );
      (createProject as any).mockResolvedValue({ id: "new-project" });

      const { result } = renderHook(() => useAuth());

      let signInPromise: Promise<any>;
      act(() => {
        signInPromise = result.current.signIn("user@test.com", "password123");
      });

      await waitFor(() => expect(result.current.isLoading).toBe(true));

      await act(async () => {
        resolveSignIn!({ success: true });
        await signInPromise!;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns the result from the signIn action", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (createProject as any).mockResolvedValue({ id: "new-project" });

      const { result } = renderHook(() => useAuth());

      let response: any;
      await act(async () => {
        response = await result.current.signIn("user@test.com", "password123");
      });

      expect(signInAction).toHaveBeenCalledWith("user@test.com", "password123");
      expect(response).toEqual({ success: true });
    });

    test("propagates failure result without redirecting", async () => {
      (signInAction as any).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());

      let response: any;
      await act(async () => {
        response = await result.current.signIn("user@test.com", "wrong");
      });

      expect(response).toEqual({
        success: false,
        error: "Invalid credentials",
      });
      expect(mockPush).not.toHaveBeenCalled();
      expect(createProject).not.toHaveBeenCalled();
      expect(getProjects).not.toHaveBeenCalled();
    });

    test("resets isLoading even when the action throws", async () => {
      (signInAction as any).mockRejectedValue(new Error("network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(
          result.current.signIn("user@test.com", "password123")
        ).rejects.toThrow("network error");
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("creates a project from anonymous work and redirects on success", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue({
        messages: [{ id: "1", role: "user", content: "Hello" }],
        fileSystemData: { "/App.jsx": { type: "file", content: "code" } },
      });
      (createProject as any).mockResolvedValue({ id: "project-123" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "password123");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ id: "1", role: "user", content: "Hello" }],
          data: { "/App.jsx": { type: "file", content: "code" } },
        })
      );
      expect(clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-123");
      expect(getProjects).not.toHaveBeenCalled();
    });

    test("ignores anonymous work with no messages and falls back to existing projects", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue({
        messages: [],
        fileSystemData: {},
      });
      (getProjects as any).mockResolvedValue([{ id: "existing-project" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "password123");
      });

      expect(createProject).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-project");
    });

    test("redirects to most recent project when one exists and there is no anon work", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getProjects as any).mockResolvedValue([
        { id: "recent-project" },
        { id: "older-project" },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/recent-project");
      expect(createProject).not.toHaveBeenCalled();
    });

    test("creates a new empty project when there is no anon work and no existing projects", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getProjects as any).mockResolvedValue([]);
      (createProject as any).mockResolvedValue({ id: "new-project" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "password123");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({ messages: [], data: {} })
      );
      expect(mockPush).toHaveBeenCalledWith("/new-project");
    });
  });

  describe("signUp", () => {
    test("sets isLoading while in flight and resets after completion", async () => {
      let resolveSignUp: (value: any) => void;
      (signUpAction as any).mockReturnValue(
        new Promise((resolve) => {
          resolveSignUp = resolve;
        })
      );

      const { result } = renderHook(() => useAuth());

      let signUpPromise: Promise<any>;
      act(() => {
        signUpPromise = result.current.signUp("user@test.com", "password123");
      });

      await waitFor(() => expect(result.current.isLoading).toBe(true));

      await act(async () => {
        resolveSignUp!({ success: true });
        await signUpPromise!;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns the result from the signUp action", async () => {
      (signUpAction as any).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());

      let response: any;
      await act(async () => {
        response = await result.current.signUp("user@test.com", "password123");
      });

      expect(signUpAction).toHaveBeenCalledWith("user@test.com", "password123");
      expect(response).toEqual({ success: true });
    });

    test("propagates failure result without redirecting", async () => {
      (signUpAction as any).mockResolvedValue({
        success: false,
        error: "Email already registered",
      });

      const { result } = renderHook(() => useAuth());

      let response: any;
      await act(async () => {
        response = await result.current.signUp("user@test.com", "password123");
      });

      expect(response).toEqual({
        success: false,
        error: "Email already registered",
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("resets isLoading even when the action throws", async () => {
      (signUpAction as any).mockRejectedValue(new Error("network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(
          result.current.signUp("user@test.com", "password123")
        ).rejects.toThrow("network error");
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("creates a project from anonymous work and redirects on success", async () => {
      (signUpAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue({
        messages: [{ id: "1", role: "user", content: "Hello" }],
        fileSystemData: { "/App.jsx": { type: "file", content: "code" } },
      });
      (createProject as any).mockResolvedValue({ id: "project-456" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("user@test.com", "password123");
      });

      expect(clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-456");
    });
  });
});
