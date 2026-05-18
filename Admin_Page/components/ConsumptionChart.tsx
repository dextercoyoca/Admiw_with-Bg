import { useThemePalette } from "@/lib/theme";
import { useState } from "react";
import { Text, View } from "react-native";

export interface ConsumptionData {
  name: string;
  usage: number;
  maxUsage?: number;
}

interface ConsumptionChartProps {
  data: ConsumptionData[];
  height?: number;
  showLabels?: boolean;
  barColor?: string;
}

export function ConsumptionChart({
  data,
  height = 200,
  showLabels = true,
  barColor,
}: ConsumptionChartProps) {
  const palette = useThemePalette();
  const activeBarColor = barColor || palette.accent;

  if (!data || data.length === 0) {
    return (
      <View
        style={{
          height,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 10,
          backgroundColor: palette.panelSoft,
          borderWidth: 1,
          borderColor: "rgba(157,178,223,0.35)",
        }}
      >
        <Text style={{ color: palette.textMuted }}>No data available</Text>
      </View>
    );
  }

  const usageValues = data.map((d) => d.usage);
  const minUsage = Math.min(...usageValues);
  const rawMaxUsage = Math.max(1, ...data.map((d) => d.maxUsage || d.usage));
  const usageRange = Math.max(rawMaxUsage - minUsage, rawMaxUsage * 0.08, 1);
  const yMin = Math.max(0, minUsage - usageRange * 0.2);
  const yMax = rawMaxUsage + usageRange * 0.25;
  const yRange = Math.max(yMax - yMin, 1);
  const chartHeight = height - (showLabels ? 40 : 20);
  const barWidth = Math.max(30, 100 / data.length);

  return (
    <View
      style={{
        backgroundColor: palette.panelSoft,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "rgba(157,178,223,0.35)",
        padding: 12,
      }}
    >
      {/* Chart */}
      <View
        style={{
          height: chartHeight,
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-around",
          gap: 8,
          marginBottom: showLabels ? 12 : 0,
        }}
      >
        {data.map((item, index) => {
          const barHeight = Math.max(
            4,
            ((item.usage - yMin) / yRange) * chartHeight
          );
          return (
            <View key={index} style={{ alignItems: "center", gap: 4 }}>
              <View
                style={{
                  width: barWidth,
                  height: barHeight,
                  backgroundColor: activeBarColor,
                  borderRadius: 4,
                  opacity: 0.85,
                }}
              />
              {/* Value Label */}
              <Text
                style={{
                  color: palette.accent,
                  fontSize: 10,
                  fontWeight: "700",
                }}
              >
                {item.usage.toFixed(0)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* X-axis Labels */}
      {showLabels && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            gap: 8,
            borderTopWidth: 1,
            borderTopColor: "rgba(157,178,223,0.22)",
            paddingTop: 8,
          }}
        >
          {data.map((item, index) => (
            <Text
              key={index}
              numberOfLines={1}
              style={{
                color: palette.textMuted,
                fontSize: 9,
                maxWidth: barWidth + 10,
                textAlign: "center",
              }}
            >
              {item.name}
            </Text>
          ))}
        </View>
      )}

      {/* Legend */}
      <View
        style={{
          marginTop: 12,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: "rgba(157,178,223,0.22)",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <View
          style={{
            width: 12,
            height: 12,
            backgroundColor: activeBarColor,
            borderRadius: 2,
          }}
        />
        <Text style={{ color: palette.textMuted, fontSize: 12 }}>
          Consumption (kWh)
        </Text>
      </View>
    </View>
  );
}

export interface UsageTrendData {
  label: string;
  usage: number;
}

interface UsageTrendChartProps {
  data: UsageTrendData[];
  height?: number;
}

export function UsageTrendChart({ data, height = 150 }: UsageTrendChartProps) {
  const palette = useThemePalette();
  const [width, setWidth] = useState(0);
  const chartHeight = Math.max(80, height - 44);
  const paddedWidth = Math.max(0, width - 24);
  const maxUsage = Math.max(1, ...data.map((item) => item.usage));
  const middleIndex = Math.floor((data.length - 1) / 2);
  const points = data.map((item, index) => {
    const x = data.length === 1 ? paddedWidth / 2 : (index / (data.length - 1)) * paddedWidth;
    const y = chartHeight - (item.usage / maxUsage) * chartHeight;
    return { ...item, x: x + 12, y: y + 8 };
  });

  if (!data || data.length === 0) {
    return (
      <View
        style={{
          height,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 10,
          backgroundColor: palette.panelSoft,
          borderWidth: 1,
          borderColor: "rgba(157,178,223,0.35)",
        }}
      >
        <Text style={{ color: palette.textMuted }}>No usage trend available</Text>
      </View>
    );
  }

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{
        height,
        borderRadius: 10,
        backgroundColor: palette.panelSoft,
        borderWidth: 1,
        borderColor: "rgba(157,178,223,0.35)",
        paddingTop: 8,
        overflow: "hidden",
      }}
    >
      <View style={{ height: chartHeight + 16 }}>
        {[0, 1, 2].map((line) => (
          <View
            key={line}
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              top: 8 + (chartHeight / 2) * line,
              height: 1,
              backgroundColor: "rgba(157,178,223,0.18)",
            }}
          />
        ))}

        {width > 0 &&
          points.slice(1).map((point, index) => {
            const previous = points[index];
            const dx = point.x - previous.x;
            const dy = point.y - previous.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = `${(Math.atan2(dy, dx) * 180) / Math.PI}deg`;

            return (
              <View
                key={`${point.label}-${index}`}
                style={{
                  position: "absolute",
                  left: (point.x + previous.x) / 2 - length / 2,
                  top: (point.y + previous.y) / 2,
                  width: length,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: palette.accent,
                  transform: [{ rotate: angle }],
                }}
              />
            );
          })}

        {width > 0 &&
          points.map((point, index) => (
            <View key={`${point.label}-${index}-point`}>
              <View
                style={{
                  position: "absolute",
                  left: point.x - 4,
                  top: point.y - 4,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: palette.accent,
                  borderWidth: 2,
                  borderColor: palette.panelSoft,
                }}
              />
              <Text
                style={{
                  position: "absolute",
                  left: Math.max(4, Math.min(point.x - 22, width - 48)),
                  top: Math.max(0, point.y - 24),
                  width: 44,
                  textAlign: "center",
                  color: palette.text,
                  fontSize: 10,
                  fontWeight: "800",
                }}
              >
                {point.usage.toFixed(0)}
              </Text>
            </View>
          ))}
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: 12,
          paddingTop: 6,
          borderTopWidth: 1,
          borderTopColor: "rgba(157,178,223,0.22)",
        }}
      >
        {data.map((item, index) => (
          <Text
            key={`${item.label}-${index}-label`}
            numberOfLines={1}
            style={{
              color: palette.textMuted,
              fontSize: 9,
              maxWidth: 46,
              textAlign: "center",
            }}
          >
            {data.length <= 6 || index === 0 || index === middleIndex || index === data.length - 1
              ? item.label
              : ""}
          </Text>
        ))}
      </View>
    </View>
  );
}
