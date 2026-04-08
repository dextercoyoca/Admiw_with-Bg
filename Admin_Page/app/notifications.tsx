import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AdminShell } from "@/components/AdminShell";
import { palette } from "@/lib/theme";

export default function NotificationsPage() {
  const [message, setMessage] = useState("");
  const [feed, setFeed] = useState<string[]>([]);

  return (
    <AdminShell title="Notifications" subtitle="Send announcements and unpaid bill reminders">
      <View style={panel}>
        <Text style={{ color: palette.textMuted, marginBottom: 8 }}>
          Announcement message for all users
        </Text>
        <TextInput
          placeholder="Type message"
          placeholderTextColor="#7f95c5"
          value={message}
          onChangeText={setMessage}
          style={input}
        />
        <Pressable
          onPress={() => {
            if (!message.trim()) return;
            setFeed((prev) => [`${new Date().toLocaleString()}: ${message.trim()}`, ...prev]);
            setMessage("");
          }}
          style={primaryBtn}
        >
          <Text style={{ color: "#1b1e2f", fontWeight: "800" }}>Send Notification</Text>
        </Pressable>
      </View>

      <View style={panel}>
        <Text style={{ color: palette.text, fontWeight: "800", marginBottom: 8 }}>Recent Sent</Text>
        {feed.length === 0 ? (
          <Text style={{ color: palette.textMuted }}>No announcements sent yet.</Text>
        ) : (
          feed.map((item) => (
            <Text key={item} style={{ color: palette.textMuted, marginBottom: 6 }}>
              {item}
            </Text>
          ))
        )}
      </View>
    </AdminShell>
  );
}

const panel = {
  borderWidth: 1,
  borderColor: palette.cardBorder,
  borderRadius: 14,
  backgroundColor: "rgba(7, 21, 68, 0.9)",
  padding: 14,
};

const input = {
  borderWidth: 1,
  borderColor: "rgba(157,178,223,0.35)",
  borderRadius: 10,
  backgroundColor: "rgba(5, 17, 55, 0.95)",
  color: palette.text,
  paddingHorizontal: 12,
  paddingVertical: 10,
};

const primaryBtn = {
  borderRadius: 10,
  backgroundColor: palette.accent,
  paddingHorizontal: 14,
  paddingVertical: 10,
  marginTop: 10,
  alignSelf: "flex-start" as const,
};
