import { PortalBackground } from "@/components/PortalBackground";
import { useAuth } from "@/lib/auth";
import { LoginError } from "@/lib/authApi";
import { useThemePalette } from "@/lib/theme";
import { FontAwesome6 } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 2 * 60 * 60;

export default function Index() {
  const palette = useThemePalette();
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_LOGIN_ATTEMPTS);
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState(0);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLocked = lockoutSecondsLeft > 0;
  const canSubmit = Boolean(identifier.trim() && password.trim() && !isSubmitting && !isLocked);
  const lockoutMessage = `Too many unsuccessful attempts to enter First space password. You are locked now. Try again in ${formatLockoutTime(lockoutSecondsLeft)}`;

  useEffect(() => {
    if (!isLocked) {
      return;
    }

    const intervalId = setInterval(() => {
      setLockoutSecondsLeft((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isLocked]);

  useEffect(() => {
    if (lockoutSecondsLeft !== 0 || attemptsLeft > 0) {
      return;
    }

    setAttemptsLeft(MAX_LOGIN_ATTEMPTS);
    setError("");
    setRetryAfter(null);
  }, [attemptsLeft, lockoutSecondsLeft]);

  async function handleSignIn() {
    if (isLocked) {
      return;
    }

    setError("");
    setRetryAfter(null);

    if (!identifier.trim() || !password.trim()) {
      setError("Please enter your admin username/email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(identifier, password, rememberMe);
      router.replace("/dashboard");
    } catch (authError) {
      const message =
        authError instanceof Error ? authError.message : "Unable to sign in right now";
      setError(message);
      setAttemptsLeft((current) => {
        const nextAttemptsLeft = Math.max(current - 1, 0);
        if (nextAttemptsLeft === 0) {
          setLockoutSecondsLeft(LOCKOUT_DURATION_SECONDS);
          setRetryAfter(null);
        }

        return nextAttemptsLeft;
      });
      if (authError instanceof LoginError) {
        setRetryAfter(authError.retryAfter ?? null);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePasswordKeyPress(event: {
    nativeEvent?: { key?: string; getModifierState?: (key: string) => boolean };
  }) {
    const key = event.nativeEvent?.key || "";
    const modifierState = event.nativeEvent?.getModifierState;
    if (typeof modifierState === "function") {
      setCapsLockOn(Boolean(modifierState("CapsLock")));
      return;
    }

    if (key.length === 1 && /[A-Z]/.test(key)) {
      setCapsLockOn(true);
    }
  }

  return (
    <PortalBackground>
      <View style={{ flex: 1, padding: 24 }}>
        <View
          style={{
            maxWidth: 460,
            width: "100%",
            alignSelf: "center",
            flex: 1,
            justifyContent: "center",
          }}
        >
          <View
            style={{
              borderWidth: 1,
              borderColor: palette.cardBorder,
              backgroundColor: palette.card,
              borderRadius: 28,
              padding: 28,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.28,
              shadowRadius: 24,
              elevation: 10,
              gap: 18,
            }}
          >
            <View
              style={{
                alignItems: "center",
                gap: 12,
              }}
            >
              <Image
                source={require("../assets/images/Electripay-final-logo-transparent.png")}
                style={{ width: 68, height: 68 }}
                resizeMode="contain"
              />
              <Text
                style={{
                  color: palette.text,
                  fontSize: 38,
                  fontFamily: "ElectricFormula",
                  letterSpacing: 0.6,
                }}
              >
                ELECTRIPAY
              </Text>
              <Text style={{ color: palette.textMuted, fontSize: 14, textAlign: "center" }}>
                Admin login page
              </Text>
            </View>

            <View
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.15)",
                padding: 22,
                backgroundColor: palette.panel,
                gap: 12,
              }}
            >
              <Text style={{ color: palette.text, fontSize: 20, fontWeight: "800" }}>
                Admin Sign In
              </Text>
              <Text style={{ color: palette.textMuted, lineHeight: 20 }}>
                Sign in to manage users, billing, receipts, and system settings.
              </Text>
              <View style={{ position: "relative" }}>
                <View style={inputIconLeft}>
                  <FontAwesome6 name="user-shield" size={14} color="#7186ba" />
                </View>
                <TextInput
                  placeholder="Admin email or username"
                  placeholderTextColor="#7186ba"
                  value={identifier}
                  onChangeText={(value) => {
                    setIdentifier(value);
                    if (!isLocked) {
                      setError("");
                    }
                  }}
                  autoCapitalize="none"
                  style={[
                    fieldStyle(palette, Boolean(error && !identifier.trim())),
                    { paddingLeft: 42 },
                  ]}
                />
              </View>
              {!identifier.trim() && error ? (
                <Text style={inlineError(palette)}>Admin email or username is required.</Text>
              ) : null}

              <View style={{ position: "relative" }}>
                <View style={inputIconLeft}>
                  <FontAwesome6 name="lock" size={14} color="#7186ba" />
                </View>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#7186ba"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (!isLocked) {
                      setError("");
                    }
                  }}
                  onKeyPress={handlePasswordKeyPress}
                  style={[
                    fieldStyle(palette, Boolean(error && !password.trim())),
                    { paddingLeft: 42, paddingRight: 48 },
                  ]}
                />
                <Pressable
                  onPress={() => setShowPassword((current) => !current)}
                  style={passwordToggle}
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                >
                  <FontAwesome6
                    name={showPassword ? "eye-slash" : "eye"}
                    size={15}
                    color="#7186ba"
                  />
                </Pressable>
              </View>
              {!password.trim() && error ? (
                <Text style={inlineError(palette)}>Password is required.</Text>
              ) : null}
              {capsLockOn ? (
                <Text style={{ color: palette.warning, fontSize: 12 }}>
                  Caps Lock appears to be on.
                </Text>
              ) : null}

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <Pressable
                  onPress={() => setRememberMe((current) => !current)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <View style={checkbox(palette, rememberMe)}>
                    {rememberMe ? (
                      <FontAwesome6 name="check" size={11} color="#03203a" />
                    ) : null}
                  </View>
                  <Text style={{ color: palette.textMuted }}>Remember me</Text>
                </Pressable>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                  Authorized administrators only.
                </Text>
              </View>

              {error || isLocked ? (
                <View style={errorPanel(palette)}>
                  <FontAwesome6 name="triangle-exclamation" size={14} color={palette.danger} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: palette.danger, fontWeight: "800" }}>
                      {isLocked ? lockoutMessage : error}
                    </Text>
                    {!isLocked ? (
                      <Text style={{ color: palette.textMuted, marginTop: 4, fontSize: 12 }}>
                        {attemptsLeft} login attempt{attemptsLeft === 1 ? "" : "s"} left.
                      </Text>
                    ) : null}
                    {!isLocked && retryAfter !== null ? (
                      <Text style={{ color: palette.textMuted, marginTop: 4, fontSize: 12 }}>
                        Try again in {retryAfter} seconds.
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
              <Pressable
                onPress={handleSignIn}
                disabled={!canSubmit}
                style={{
                  marginTop: 6,
                  borderRadius: 12,
                  paddingVertical: 13,
                  backgroundColor: canSubmit ? palette.cyan : "#42a9cd",
                  alignItems: "center",
                  opacity: canSubmit ? 1 : 0.62,
                }}
              >
                {isSubmitting ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <ActivityIndicator color="#03203a" />
                    <Text style={{ color: "#03203a", fontWeight: "800" }}>
                      Logging in...
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: "#03203a", fontWeight: "800" }}>
                    {isLocked ? "Locked" : "Log In"}
                  </Text>
                )}
              </Pressable>
              <Text style={{ color: palette.textMuted, textAlign: "center", fontSize: 12 }}>
                Secure admin access - session protected by rate limiting
              </Text>
            </View>
          </View>
        </View>
      </View>
    </PortalBackground>
  );
}

const fieldStyle = (
  palette: ReturnType<typeof useThemePalette>,
  invalid = false,
) => ({
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  backgroundColor: palette.panelSoft,
  color: palette.text,
  borderWidth: 1,
  borderColor: invalid ? palette.danger : palette.inputBorder,
});

const inlineError = (palette: ReturnType<typeof useThemePalette>) => ({
  color: palette.danger,
  fontSize: 12,
  marginTop: -6,
});

function formatLockoutTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

const passwordToggle = {
  position: "absolute" as const,
  right: 14,
  top: 0,
  bottom: 0,
  justifyContent: "center" as const,
  alignItems: "center" as const,
};

const inputIconLeft = {
  position: "absolute" as const,
  left: 14,
  top: 0,
  bottom: 0,
  justifyContent: "center" as const,
  alignItems: "center" as const,
  zIndex: 1,
};

const checkbox = (
  palette: ReturnType<typeof useThemePalette>,
  checked: boolean,
) => ({
  width: 18,
  height: 18,
  borderRadius: 5,
  borderWidth: 1,
  borderColor: checked ? palette.cyan : palette.inputBorder,
  backgroundColor: checked ? palette.cyan : "transparent",
  alignItems: "center" as const,
  justifyContent: "center" as const,
});

const errorPanel = (palette: ReturnType<typeof useThemePalette>) => ({
  borderWidth: 1,
  borderColor: "rgba(239,68,68,0.45)",
  backgroundColor: "rgba(239,68,68,0.12)",
  borderRadius: 10,
  padding: 10,
  flexDirection: "row" as const,
  gap: 8,
});
