import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import Auth from "./Auth";

const login = vi.fn();
const verifyOtp = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams()],
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    login,
    verifyOtp,
  }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
    },
  },
}));

describe("Auth", () => {
  beforeEach(() => {
    login.mockReset();
    verifyOtp.mockReset();
    login.mockResolvedValue(true);
  });

  it("routes sign-in and create-account actions to separate buttons", async () => {
    const user = userEvent.setup();
    render(<Auth />);

    await user.type(screen.getByPlaceholderText(/amina@example.com/i), "person@example.com");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(login).toHaveBeenCalledWith("", "person@example.com", "investor");

    render(<Auth />);
    await user.type(screen.getByPlaceholderText(/amina okafor/i), "Ada Lovelace");
    await user.type(screen.getByPlaceholderText(/amina@example.com/i), "ada@example.com");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(login).toHaveBeenLastCalledWith("Ada Lovelace", "ada@example.com", "investor");
  });
});
