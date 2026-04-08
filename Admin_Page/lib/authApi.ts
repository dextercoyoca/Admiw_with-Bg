export type AdminSession = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  token: string;
};

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
  };

  if (!response.ok || !payload.session) {
    throw new Error(payload.error || "Unable to sign in");
  }

  return payload.session;
}
