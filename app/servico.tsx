import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { useQuote } from "@/lib/quote-store";
import { formatCurrency } from "@/lib/quote-utils";
import { useServices } from "@/lib/service-store";

export default function ServiceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { services } = useServices();
  const service = services.find((candidate) => candidate.id === id);
  const { addToQuote, items } = useQuote();
  const alreadyAdded = Boolean(service && items.some((item) => item.service.id === service.id));

  if (!service) {
    return (
      <ScreenContainer containerClassName="bg-[#F7FAFC]" className="items-center justify-center px-6">
        <MaterialIcons name="error-outline" color="#B42318" size={38} />
        <Text style={styles.errorTitle}>Serviço não encontrado</Text>
        <Text style={styles.errorText}>Volte à tabela para escolher um serviço cadastrado.</Text>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  const addService = async () => {
    haptic.success();
    await addToQuote(service);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-[#F7FAFC]">
      <View style={styles.navigation}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backIcon, pressed && styles.pressed]}>
          <MaterialIcons name="arrow-back" color="#075985" size={22} />
        </Pressable>
        <Text style={styles.navigationTitle}>Detalhe do serviço</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.categoryPill}><Text style={styles.categoryText}>{service.category}</Text></View>
        <Text style={styles.title}>{service.item}</Text>
        <Text style={styles.serviceType}>{service.serviceType}</Text>

        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Valor estimado</Text>
          <Text style={styles.priceValue}>{formatCurrency(service.price)}</Text>
          <View style={styles.durationRow}>
            <MaterialIcons name="schedule" color="#075985" size={17} />
            <Text style={styles.durationText}>Prazo médio: {service.duration}</Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailIcon}><MaterialIcons name="description" color="#075985" size={20} /></View>
          <View style={styles.detailCopy}>
            <Text style={styles.detailTitle}>Observações importantes</Text>
            <Text style={styles.detailText}>{service.notes}</Text>
          </View>
        </View>

        <View style={styles.assessmentCard}>
          <MaterialIcons name="verified-user" color="#B45309" size={20} />
          <Text style={styles.assessmentText}>Este é um pré-orçamento. O valor final e o diagnóstico dependem da avaliação técnica do equipamento.</Text>
        </View>
      </ScrollView>

      <View style={styles.bottomAction}>
        <Pressable onPress={() => void addService()} style={({ pressed }) => [styles.addButton, pressed && styles.buttonPressed]}>
          <MaterialIcons name="add-shopping-cart" color="#FFFFFF" size={20} />
          <Text style={styles.addButtonText}>{alreadyAdded ? "Adicionar mais uma unidade" : "Adicionar ao orçamento"}</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  navigation: { alignItems: "center", backgroundColor: "#F7FAFC", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  backIcon: { alignItems: "center", backgroundColor: "#E0F2FE", borderRadius: 12, height: 38, justifyContent: "center", width: 38 },
  navigationTitle: { color: "#102A43", fontSize: 15, fontWeight: "800" },
  placeholder: { width: 38 },
  content: { padding: 22, paddingTop: 17 },
  categoryPill: { alignSelf: "flex-start", backgroundColor: "#E0F2FE", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  categoryText: { color: "#075985", fontSize: 12, fontWeight: "800" },
  title: { color: "#102A43", fontSize: 29, fontWeight: "900", letterSpacing: -0.7, lineHeight: 35, marginTop: 14 },
  serviceType: { color: "#526D82", fontSize: 15, marginTop: 6 },
  priceCard: { backgroundColor: "#FFFFFF", borderColor: "#D9E2EC", borderRadius: 19, borderWidth: 1, marginTop: 24, padding: 20 },
  priceLabel: { color: "#526D82", fontSize: 13, fontWeight: "700" },
  priceValue: { color: "#15803D", fontSize: 32, fontWeight: "900", letterSpacing: -0.8, marginTop: 4 },
  durationRow: { alignItems: "center", backgroundColor: "#E0F2FE", borderRadius: 10, flexDirection: "row", gap: 7, marginTop: 16, padding: 10 },
  durationText: { color: "#075985", fontSize: 13, fontWeight: "800" },
  detailsCard: { alignItems: "flex-start", backgroundColor: "#FFFFFF", borderColor: "#D9E2EC", borderRadius: 17, borderWidth: 1, flexDirection: "row", gap: 12, marginTop: 13, padding: 16 },
  detailIcon: { alignItems: "center", backgroundColor: "#E0F2FE", borderRadius: 11, height: 38, justifyContent: "center", width: 38 },
  detailCopy: { flex: 1 },
  detailTitle: { color: "#102A43", fontSize: 14, fontWeight: "800" },
  detailText: { color: "#526D82", fontSize: 13, lineHeight: 19, marginTop: 4 },
  assessmentCard: { alignItems: "flex-start", backgroundColor: "#FFF7ED", borderRadius: 14, flexDirection: "row", gap: 9, marginTop: 13, padding: 14 },
  assessmentText: { color: "#7C2D12", flex: 1, fontSize: 12, lineHeight: 18 },
  bottomAction: { backgroundColor: "#F7FAFC", borderTopColor: "#D9E2EC", borderTopWidth: 1, paddingHorizontal: 20, paddingVertical: 14 },
  addButton: { alignItems: "center", backgroundColor: "#075985", borderRadius: 14, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 52 },
  addButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  errorTitle: { color: "#102A43", fontSize: 20, fontWeight: "800", marginTop: 13 },
  errorText: { color: "#526D82", fontSize: 14, marginTop: 5, textAlign: "center" },
  backButton: { backgroundColor: "#075985", borderRadius: 12, marginTop: 20, paddingHorizontal: 20, paddingVertical: 12 },
  backButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  pressed: { opacity: 0.72 },
  buttonPressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
});
