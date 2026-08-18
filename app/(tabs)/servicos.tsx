import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ServiceCard } from "@/components/service-card";
import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/nrv-catalog";
import { useQuote } from "@/lib/quote-store";
import { useServices } from "@/lib/service-store";

export default function ServicesScreen() {
  const router = useRouter();
  const { addToQuote, items } = useQuote();
  const { services } = useServices();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ServiceCategory | "Todos">("Todos");

  const filteredServices = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("pt-BR");
    return services.filter((service) => {
      const categoryMatches = category === "Todos" || service.category === category;
      const searchMatches = !normalized || `${service.item} ${service.serviceType} ${service.category}`.toLocaleLowerCase("pt-BR").includes(normalized);
      return categoryMatches && searchMatches;
    });
  }, [category, search, services]);

  const addService = async (service: (typeof services)[number]) => {
    haptic.success();
    await addToQuote(service);
  };

  return (
    <ScreenContainer containerClassName="bg-[#F7FAFC]" className="px-5">
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>TABELA NRV</Text>
          <Text style={styles.title}>Serviços e pré-orçamentos</Text>
          <Text style={styles.subtitle}>Valores e prazos cadastrados para uma primeira estimativa.</Text>
        </View>
        <Pressable onPress={() => router.push("/admin" as never)} style={({ pressed }) => [styles.adminButton, pressed && styles.pressed]}>
          <MaterialIcons name="tune" color="#075985" size={19} />
          <Text style={styles.adminButtonText}>Gerenciar</Text>
        </Pressable>
      </View>

      <View style={styles.searchShell}>
        <MaterialIcons name="search" color="#526D82" size={21} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar peça, serviço ou categoria"
          placeholderTextColor="#7B8794"
          style={styles.searchInput}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <MaterialIcons name="close" color="#526D82" size={20} />
          </Pressable>
        )}
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={SERVICE_CATEGORIES}
        keyExtractor={(item) => item}
        style={styles.filterScroller}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => {
          const active = item === category;
          return (
            <Pressable
              onPress={() => { haptic.light(); setCategory(item); }}
              style={({ pressed }) => [styles.filterPill, active && styles.filterPillActive, pressed && styles.pressed]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{item}</Text>
            </Pressable>
          );
        }}
      />

      <View style={styles.resultRow}>
        <Text style={styles.resultText}>{filteredServices.length} {filteredServices.length === 1 ? "serviço encontrado" : "serviços encontrados"}</Text>
        <Pressable onPress={() => router.push("/(tabs)/orcamento")} style={({ pressed }) => [styles.quoteShortcut, pressed && styles.pressed]}>
          <MaterialIcons name="request-quote" color="#075985" size={17} />
          <Text style={styles.quoteShortcutText}>{items.length} no orçamento</Text>
        </Pressable>
      </View>

      <FlatList
        data={filteredServices}
        keyExtractor={(service) => service.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.serviceList}
        renderItem={({ item }) => (
          <ServiceCard
            service={item}
            onPress={() => router.push({ pathname: "/servico", params: { id: item.id } })}
            onAdd={() => void addService(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" color="#7B8794" size={32} />
            <Text style={styles.emptyTitle}>Nenhum serviço encontrado</Text>
            <Text style={styles.emptyText}>Tente uma busca diferente ou remova o filtro de categoria.</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "flex-start", flexDirection: "row", gap: 8, justifyContent: "space-between", paddingTop: 14 },
  headerCopy: { flex: 1 },
  eyebrow: { color: "#075985", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: "#102A43", fontSize: 27, fontWeight: "800", letterSpacing: -0.5, lineHeight: 33, marginTop: 5 },
  subtitle: { color: "#526D82", fontSize: 14, lineHeight: 20, marginTop: 6 },
  adminButton: { alignItems: "center", backgroundColor: "#E0F2FE", borderRadius: 10, flexDirection: "row", gap: 5, marginTop: 4, paddingHorizontal: 9, paddingVertical: 8 },
  adminButtonText: { color: "#075985", fontSize: 11, fontWeight: "800" },
  searchShell: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#D9E2EC", borderRadius: 15, borderWidth: 1, flexDirection: "row", gap: 9, marginTop: 20, paddingHorizontal: 13 },
  searchInput: { color: "#102A43", flex: 1, fontSize: 14, height: 48 },
  filterScroller: { minHeight: 54 },
  filterList: { gap: 9, paddingVertical: 14 },
  filterPill: { backgroundColor: "#FFFFFF", borderColor: "#D9E2EC", borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  filterPillActive: { backgroundColor: "#075985", borderColor: "#075985" },
  filterText: { color: "#526D82", fontSize: 13, fontWeight: "800" },
  filterTextActive: { color: "#FFFFFF" },
  resultRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingBottom: 10 },
  resultText: { color: "#526D82", fontSize: 12, fontWeight: "700" },
  quoteShortcut: { alignItems: "center", flexDirection: "row", gap: 5 },
  quoteShortcutText: { color: "#075985", fontSize: 12, fontWeight: "800" },
  serviceList: { paddingBottom: 22 },
  emptyState: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#D9E2EC", borderRadius: 18, borderWidth: 1, marginTop: 18, padding: 28 },
  emptyTitle: { color: "#102A43", fontSize: 16, fontWeight: "800", marginTop: 12 },
  emptyText: { color: "#526D82", fontSize: 13, lineHeight: 18, marginTop: 4, textAlign: "center" },
  pressed: { opacity: 0.72 },
});
