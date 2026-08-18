import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Share, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { useQuote } from "@/lib/quote-store";
import { buildQuoteSummary, formatCurrency } from "@/lib/quote-utils";

export default function QuoteScreen() {
  const router = useRouter();
  const { items, total, itemCount, setQuoteQuantity, removeFromQuote } = useQuote();

  const shareQuote = async () => {
    if (items.length === 0) return;
    haptic.light();
    try {
      await Share.share({ message: buildQuoteSummary(items) });
    } catch {
      haptic.error();
    }
  };

  return (
    <ScreenContainer containerClassName="bg-[#F7FAFC]" className="px-5">
      <FlatList
        data={items}
        keyExtractor={(item) => item.service.id}
        contentContainerStyle={[styles.content, items.length === 0 && styles.emptyContent]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>SEU PRÉ-ORÇAMENTO</Text>
            <Text style={styles.title}>{itemCount > 0 ? `${itemCount} ${itemCount === 1 ? "item selecionado" : "itens selecionados"}` : "Nenhum item selecionado"}</Text>
            <Text style={styles.subtitle}>Revise os serviços antes de compartilhar a estimativa.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.quoteCard}>
            <Pressable onPress={() => router.push({ pathname: "/servico", params: { id: item.service.id } })} style={({ pressed }) => [styles.itemInfo, pressed && styles.pressed]}>
              <View style={styles.itemTitleRow}>
                <Text numberOfLines={2} style={styles.itemTitle}>{item.service.item}</Text>
                <Pressable onPress={() => { haptic.light(); void removeFromQuote(item.service.id); }} hitSlop={8} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
                  <MaterialIcons name="delete-outline" size={20} color="#B42318" />
                </Pressable>
              </View>
              <Text style={styles.itemMeta}>{item.service.serviceType} · {item.service.duration}</Text>
              <Text style={styles.unitPrice}>{formatCurrency(item.service.price)} cada</Text>
            </Pressable>
            <View style={styles.itemFooter}>
              <View style={styles.quantityControl}>
                <Pressable onPress={() => { haptic.light(); void setQuoteQuantity(item.service.id, item.quantity - 1); }} style={({ pressed }) => [styles.stepButton, pressed && styles.buttonPressed]}>
                  <MaterialIcons name="remove" size={18} color="#075985" />
                </Pressable>
                <Text style={styles.quantity}>{item.quantity}</Text>
                <Pressable onPress={() => { haptic.light(); void setQuoteQuantity(item.service.id, item.quantity + 1); }} style={({ pressed }) => [styles.stepButton, pressed && styles.buttonPressed]}>
                  <MaterialIcons name="add" size={18} color="#075985" />
                </Pressable>
              </View>
              <Text style={styles.lineTotal}>{formatCurrency(item.service.price * item.quantity)}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><MaterialIcons name="request-quote" color="#075985" size={31} /></View>
            <Text style={styles.emptyTitle}>Monte sua estimativa</Text>
            <Text style={styles.emptyText}>Adicione serviços da tabela para visualizar valores, prazos e total estimado.</Text>
            <Pressable onPress={() => router.push("/(tabs)/servicos")} style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
              <MaterialIcons name="build" color="#FFFFFF" size={18} />
              <Text style={styles.primaryButtonText}>Ver serviços</Text>
            </Pressable>
          </View>
        }
        ListFooterComponent={
          items.length > 0 ? (
            <View>
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Total estimado</Text>
                <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
                <Text style={styles.totalDisclaimer}>Sujeito à confirmação após avaliação técnica.</Text>
              </View>
              <Pressable onPress={() => void shareQuote()} style={({ pressed }) => [styles.shareButton, pressed && styles.buttonPressed]}>
                <MaterialIcons name="ios-share" color="#FFFFFF" size={19} />
                <Text style={styles.shareText}>Compartilhar pré-orçamento</Text>
              </Pressable>
              <View style={styles.notice}>
                <MaterialIcons name="verified-user" color="#075985" size={18} />
                <Text style={styles.noticeText}>Os valores são baseados na tabela NRV e não substituem a avaliação do equipamento.</Text>
              </View>
            </View>
          ) : null
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 28 },
  emptyContent: { flexGrow: 1 },
  header: { paddingTop: 14, paddingBottom: 19 },
  eyebrow: { color: "#075985", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: "#102A43", fontSize: 27, fontWeight: "800", letterSpacing: -0.5, lineHeight: 33, marginTop: 5 },
  subtitle: { color: "#526D82", fontSize: 14, lineHeight: 20, marginTop: 6 },
  quoteCard: { backgroundColor: "#FFFFFF", borderColor: "#D9E2EC", borderRadius: 18, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  itemInfo: { padding: 16, paddingBottom: 13 },
  itemTitleRow: { alignItems: "flex-start", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  itemTitle: { color: "#102A43", flex: 1, fontSize: 16, fontWeight: "800", lineHeight: 21 },
  deleteButton: { padding: 2 },
  itemMeta: { color: "#526D82", fontSize: 12, marginTop: 6 },
  unitPrice: { color: "#15803D", fontSize: 13, fontWeight: "800", marginTop: 10 },
  itemFooter: { alignItems: "center", borderTopColor: "#E6EEF5", borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 12 },
  quantityControl: { alignItems: "center", backgroundColor: "#F0F7FA", borderRadius: 10, flexDirection: "row", gap: 4, padding: 3 },
  stepButton: { alignItems: "center", height: 30, justifyContent: "center", width: 30 },
  quantity: { color: "#102A43", fontSize: 14, fontWeight: "800", minWidth: 20, textAlign: "center" },
  lineTotal: { color: "#102A43", fontSize: 17, fontWeight: "800" },
  totalCard: { backgroundColor: "#075985", borderRadius: 19, marginTop: 6, padding: 20 },
  totalLabel: { color: "#BAE6FD", fontSize: 13, fontWeight: "700" },
  totalValue: { color: "#FFFFFF", fontSize: 30, fontWeight: "900", letterSpacing: -0.7, marginTop: 3 },
  totalDisclaimer: { color: "#E0F2FE", fontSize: 11, lineHeight: 16, marginTop: 5 },
  shareButton: { alignItems: "center", backgroundColor: "#15803D", borderRadius: 14, flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 12, minHeight: 52 },
  shareText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  notice: { alignItems: "flex-start", backgroundColor: "#E0F2FE", borderRadius: 13, flexDirection: "row", gap: 8, marginTop: 13, padding: 12 },
  noticeText: { color: "#334E68", flex: 1, fontSize: 11, lineHeight: 16 },
  emptyState: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 26, paddingTop: 30 },
  emptyIcon: { alignItems: "center", backgroundColor: "#E0F2FE", borderRadius: 22, height: 66, justifyContent: "center", width: 66 },
  emptyTitle: { color: "#102A43", fontSize: 21, fontWeight: "800", marginTop: 18 },
  emptyText: { color: "#526D82", fontSize: 14, lineHeight: 20, marginTop: 7, textAlign: "center" },
  primaryButton: { alignItems: "center", backgroundColor: "#075985", borderRadius: 14, flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 22, paddingHorizontal: 18, paddingVertical: 14 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  pressed: { opacity: 0.72 },
  buttonPressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
});
