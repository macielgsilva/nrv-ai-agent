import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { NrvService } from "@/lib/nrv-catalog";
import { formatCurrency } from "@/lib/quote-utils";

type ServiceCardProps = {
  service: NrvService;
  onPress: () => void;
  onAdd: () => void;
  compact?: boolean;
};

export function ServiceCard({ service, onPress, onAdd, compact = false }: ServiceCardProps) {
  return (
    <View style={[styles.card, compact && styles.compactCard]}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.content, pressed && styles.pressed]}>
        <View style={styles.titleRow}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{service.category}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={21} color="#7B8794" />
        </View>
        <Text numberOfLines={2} style={styles.title}>
          {service.item}
        </Text>
        <Text numberOfLines={1} style={styles.type}>
          {service.serviceType}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.price}>{formatCurrency(service.price)}</Text>
          <View style={styles.timeRow}>
            <MaterialIcons name="schedule" size={14} color="#526D82" />
            <Text style={styles.duration}>{service.duration}</Text>
          </View>
        </View>
      </Pressable>
      <Pressable onPress={onAdd} style={({ pressed }) => [styles.addButton, pressed && styles.buttonPressed]}>
        <MaterialIcons name="add" size={18} color="#FFFFFF" />
        <Text style={styles.addText}>Adicionar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D9E2EC",
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  compactCard: { marginBottom: 0 },
  content: { padding: 16 },
  pressed: { opacity: 0.72 },
  titleRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  categoryPill: { backgroundColor: "#E0F2FE", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  categoryText: { color: "#075985", fontSize: 11, fontWeight: "700" },
  title: { color: "#102A43", fontSize: 17, fontWeight: "700", lineHeight: 22 },
  type: { color: "#526D82", fontSize: 13, marginTop: 5 },
  metaRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  price: { color: "#15803D", fontSize: 18, fontWeight: "800" },
  timeRow: { alignItems: "center", flexDirection: "row", gap: 4, maxWidth: "56%" },
  duration: { color: "#526D82", fontSize: 12, fontWeight: "600", flexShrink: 1, textAlign: "right" },
  addButton: { alignItems: "center", backgroundColor: "#075985", flexDirection: "row", gap: 7, justifyContent: "center", paddingVertical: 12 },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  addText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
});
