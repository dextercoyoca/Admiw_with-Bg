import React, { useState } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function Index() {
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    resetMessages();
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      console.log("Login attempted with:", { email, password, rememberMe });
      router.push("/dashboard");
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    resetMessages();
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      console.log("Signup attempted with:", { firstName, lastName, email, password });
      setSuccess("Account created successfully! Please log in.");
      setIsLogin(true);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 20,
          backgroundColor: "#E6F4FE",
        }}
      >
        <View style={{ alignItems: "center", marginBottom: 30 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#0066CC",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <MaterialIcons name="admin-panel-settings" size={40} color="white" />
          </View>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "bold",
              color: "#0066CC",
              marginBottom: 8,
            }}
          >
            Admin Portal
          </Text>
          <Text style={{ fontSize: 14, color: "#666666", textAlign: "center" }}>
            {isLogin
              ? "Sign in to access your admin dashboard"
              : "Create an account to get started"}
          </Text>
        </View>

        {error ? (
          <View
            style={{
              backgroundColor: "#FFE6E6",
              borderLeftWidth: 4,
              borderLeftColor: "#CC0000",
              padding: 12,
              borderRadius: 6,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: "#CC0000", fontSize: 14 }}>{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View
            style={{
              backgroundColor: "#E6F2E6",
              borderLeftWidth: 4,
              borderLeftColor: "#2E8B57",
              padding: 12,
              borderRadius: 6,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: "#2E8B57", fontSize: 14 }}>{success}</Text>
          </View>
        ) : null}

        {!isLogin && (
          <>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: "#333333", fontWeight: "600", marginBottom: 6 }}>
                First Name
              </Text>
              <TextInput
                placeholder="First Name"
                value={firstName}
                onChangeText={setFirstName}
                editable={!loading}
                placeholderTextColor="#999999"
                style={{
                  borderWidth: 1.5,
                  borderColor: "#B3D9F2",
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: "white",
                  color: "#333333",
                }}
              />
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: "#333333", fontWeight: "600", marginBottom: 6 }}>
                Last Name
              </Text>
              <TextInput
                placeholder="Last Name"
                value={lastName}
                onChangeText={setLastName}
                editable={!loading}
                placeholderTextColor="#999999"
                style={{
                  borderWidth: 1.5,
                  borderColor: "#B3D9F2",
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: "white",
                  color: "#333333",
                }}
              />
            </View>
          </>
        )}

        <View style={{ marginBottom: 14 }}>
          <Text style={{ color: "#333333", fontWeight: "600", marginBottom: 6 }}>
            Email Address
          </Text>
          <TextInput
            placeholder="admin@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            editable={!loading}
            placeholderTextColor="#999999"
            style={{
              borderWidth: 1.5,
              borderColor: "#B3D9F2",
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: "white",
              color: "#333333",
            }}
          />
        </View>

        <View style={{ marginBottom: 14 }}>
          <Text style={{ color: "#333333", fontWeight: "600", marginBottom: 6 }}>
            Password
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1.5,
              borderColor: "#B3D9F2",
              borderRadius: 8,
              paddingHorizontal: 12,
              backgroundColor: "white",
            }}
          >
            <TextInput
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
              placeholderTextColor="#999999"
              style={{ flex: 1, paddingVertical: 12, color: "#333333" }}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={loading}>
              <MaterialIcons
                name={showPassword ? "visibility-off" : "visibility"}
                size={24}
                color="#0066CC"
              />
            </TouchableOpacity>
          </View>
        </View>

        {!isLogin && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: "#333333", fontWeight: "600", marginBottom: 6 }}>
              Confirm Password
            </Text>
            <TextInput
              placeholder="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
              placeholderTextColor="#999999"
              style={{
                borderWidth: 1.5,
                borderColor: "#B3D9F2",
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: "white",
                color: "#333333",
              }}
            />
          </View>
        )}

        {isLogin ? (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <TouchableOpacity
              onPress={() => setRememberMe(!rememberMe)}
              style={{ flexDirection: "row", alignItems: "center" }}
              disabled={loading}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderWidth: 1.5,
                  borderColor: "#0066CC",
                  borderRadius: 4,
                  marginRight: 8,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: rememberMe ? "#0066CC" : "white",
                }}
              >
                {rememberMe && <MaterialIcons name="check" size={14} color="white" />}
              </View>
              <Text style={{ color: "#666666", fontSize: 14 }}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity disabled={loading}>
              <Text style={{ color: "#0066CC", fontSize: 14, fontWeight: "500" }}>
                Forgot password?
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={isLogin ? handleLogin : handleSignup}
          disabled={loading}
          style={{
            backgroundColor: loading ? "#4D99E6" : "#0066CC",
            paddingVertical: 14,
            borderRadius: 8,
            marginBottom: 16,
            alignItems: "center",
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
              {isLogin ? "Sign In" : "Sign Up"}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 20 }}>
          <Text style={{ color: "#666666", fontSize: 14 }}>
            {isLogin ? "Don’t have an account? " : "Already have an account? "}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setError("");
              setSuccess("");
              setIsLogin(!isLogin);
            }}
            disabled={loading}
          >
            <Text style={{ color: "#0066CC", fontWeight: "600", fontSize: 14 }}>
              {isLogin ? "Sign Up" : "Sign In"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: "center", marginTop: 10 }}>
          <Text style={{ color: "#666666", fontSize: 13 }}>
            Having trouble?{
              " "}
            <Text style={{ color: "#0066CC", fontWeight: "600" }}>Contact Support</Text>
          </Text>
        </View>

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "#B3D9F2",
            marginTop: 24,
            paddingTop: 16,
          }}
        >
          <Text style={{ color: "#999999", fontSize: 12, textAlign: "center" }}>
            © 2026 Admin Portal. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

