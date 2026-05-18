export type AdminSession = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  token: string;
};

export class LoginError extends Error {
  attemptsLeft?: number;
  retryAfter?: number;

  constructor(message: string, details?: { attemptsLeft?: number; retryAfter?: number }) {
    super(message);
    this.name = "LoginError";
    this.attemptsLeft = details?.attemptsLeft;
    this.retryAfter = details?.retryAfter;
  }
}

export async function loginAdmin(identifier: string, password: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ identifier, password }),
  });

  const payload = (await response.json()) as {
    session?: AdminSession;
    error?: string;
    attemptsLeft?: number;
    retryAfter?: number;
  };

  if (!response.ok || !payload.session) {
    throw new LoginError(payload.error || "Unable to sign in", {
      attemptsLeft: payload.attemptsLeft,
      retryAfter: payload.retryAfter,
    });
  }

  return payload.session;
}
