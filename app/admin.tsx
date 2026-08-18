import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/nrv-catalog";
import { formatCurrency } from "@/lib/quote-utils";
import { type ServiceDraft, useServices } from "@/lib/service-store";

type ServiceForm = Omit<ServiceDraft, "price"> & { price: string };

const emptyForm: ServiceForm = {
  category: "Hardware",
  item: "",
  serviceType: "",
  price: "",
  duration: "",
  notes: "",
};

function toForm(service: ServiceDraft): ServiceForm {
  return { ...service, price: String(service.price).replace(".", ",") };
}

export default function AdminScreen() {
  const router = useRouter();
  const { services, createService, updateService, deleteService, restoreDefaultServices } = useServices();
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState("");

  const updateField = <K extends keyof ServiceForm>(key: K, value: ServiceForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFormError("");
  };

  const closeForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setShowForm(false);
  };

  const startCreate = () => {
    haptic.light();
    setStatus("");
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setShowForm(true);
  };

  const startEdit = (service: (typeof services)[number]) => {
    haptic.light();
    setStatus("");
    setEditingId(service.id);
    setForm(toForm(service));
    setFormError("");
    setShowForm(true);
  };

  const save = async () => {
    const price = Number(form.price.replace(/\./g, "").replace(",", "."));
    if (!form.item.trim() || !form.serviceType.trim() || !form.duration.trim() || !Number.isFinite(price) || price < 0) {
      setFormError("Preencha nome, tipo, valor e prazo com dados válidos.");
      haptic.error();
      return;
    }

    const draft: ServiceDraft = {
      category: form.category,
      item: form.item.trim(),
      serviceType: form.serviceType.trim(),
      price,
      duration: form.duration.trim(),
      notes: form.notes.trim() || "Sem observações.",
    };

    if (editingId) {
      await updateService(editingId, draft);
      setStatus("Serviço atualizado neste dispositivo.");
    } else {
      await createService(draft);
      setStatus("Serviço cadastrado neste dispositivo.");
    }
    haptic.success();
    closeForm();
  };

  const askDelete = (id: string, name: string) => {
    Alert.alert("Excluir serviço?", `“${name}” será removido da tabela deste dispositivo.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => {
          void deleteService(id).then(() => {
            haptic.success();
            setStatus("Serviço removido da tabela.");
            if (editingId === id) closeForm();
          });
        },
      },
    ]);
  };

  const askRestore = () => {
    Alert.alert("Restaurar tabela original?", "Os serviços cadastrados ou alterados neste dispositivo serão substituídos pela tabela inicial da NRV.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Restaurar",
        style: "destructive",
        onPress: () => {
          void restoreDefaultServices().then(() => {
            haptic.success();
            closeForm();
            setStatus("Tabela original restaurada.");
          });
        },
      },
    ]);
  };

  return (
    <ScreenContainer containerClassName="bg-[#F7FAFC]" className="px-5">
      <FlatList
        data={services}
        keyExtractor={(service) => service.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.navigation}>
              <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
                <MaterialIcons name="arrow-back" color="#075985" size={22} />
              </Pressable>
              <Text style={styles.navigationTitle}>Painel administrativo</Text>
              <View style={styles.navigationSpacer} />
            </View>

            <Text style={styles.eyebrow}>TABELA NRV</Text>
            <Text style={styles.title}>Gerencie serviços e valores</Text>
            <Text style={styles.subtitle}>As alterações ficam salvas neste dispositivo e passam a ser usadas no catálogo, nos novos orçamentos e na conversa com o assistente.</Text>

            <View style={styles.actionRow}>
              <Pressable onPress={startCreate} style={({ pressed }) => [styles.primaryAction, pressed && styles.buttonPressed]}>
                <MaterialIcons name="add" color="#FFFFFF" size={20} />
                <Text style={styles.primaryActionText}>Novo serviço</Text>
              </Pressable>
              <Pressable onPress={askRestore} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}>
                <MaterialIcons name="restart-alt" color="#075985" size={19} />
                <Text style={styles.secondaryActionText}>Restaurar</Text>
              </Pressable>
            </View>

            {status ? <Text style={styles.status}>{status}</Text> : null}

            {showForm && (
              <View style={styles.formCard}>
                <View style={styles.formTitleRow}>
                  <View>
                    <Text style={styles.formTitle}>{editingId ? "Editar serviço" : "Novo serviço"}</Text>
                    <Text style={styles.formHelper}>Campos com dados objetivos facilitam os pré-orçamentos.</Text>
                  </View>
                  <Pressable onPress={closeForm} hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
                    <MaterialIcons name="close" color="#526D82" size={22} />
                  </Pressable>
                </View>

                <Text style={styles.label}>Categoria</Text>
                <View style={styles.categoryRow}>
                  {SERVICE_CATEGORIES.filter((category): category is ServiceCategory => category !== "Todos").map((category) => {
                    const active = form.category === category;
                    return (
                      <Pressable key={category} onPress={() => updateField("category", category)} style={({ pressed }) => [styles.categoryOption, active && styles.categoryOptionActive, pressed && styles.pressed]}>
                        <Text style={[styles.categoryOptionText, active && styles.categoryOptionTextActive]}>{category}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.label}>Nome do serviço ou peça</Text>
                <TextInput value={form.item} onChangeText={(value) => updateField("item", value)} placeholder="Ex.: Troca de fonte ATX" placeholderTextColor="#7B8794" style={styles.input} />

                <Text style={styles.label}>Tipo de serviço</Text>
                <TextInput value={form.serviceType} onChangeText={(value) => updateField("serviceType", value)} placeholder="Ex.: Substituição de peça" placeholderTextColor="#7B8794" style={styles.input} />

                <View style={styles.twoColumns}>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.label}>Valor (R$)</Text>
                    <TextInput value={form.price} onChangeText={(value) => updateField("price", value)} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor="#7B8794" style={styles.input} />
                  </View>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.label}>Prazo</Text>
                    <TextInput value={form.duration} onChangeText={(value) => updateField("duration", value)} placeholder="Ex.: 2 dias" placeholderTextColor="#7B8794" style={styles.input} />
                  </View>
                </View>

                <Text style={styles.label}>Observações</Text>
                <TextInput value={form.notes} onChangeText={(value) => updateField("notes", value)} multiline placeholder="Garantia, condição ou detalhe relevante" placeholderTextColor="#7B8794" style={[styles.input, styles.notesInput]} textAlignVertical="top" />
                {formError ? <Text style={styles.error}>{formError}</Text> : null}

                <Pressable onPress={() => void save()} style={({ pressed }) => [styles.saveButton, pressed && styles.buttonPressed]}>
                  <MaterialIcons name="save" color="#FFFFFF" size={19} />
                  <Text style={styles.saveButtonText}>{editingId ? "Salvar alterações" : "Cadastrar serviço"}</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.listHeading}>
              <Text style={styles.listTitle}>Serviços cadastrados</Text>
              <Text style={styles.listCount}>{services.length} itens</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.serviceCard}>
            <View style={styles.serviceTopRow}>
              <View style={styles.categoryPill}><Text style={styles.categoryText}>{item.category}</Text></View>
              <Text style={styles.servicePrice}>{formatCurrency(item.price)}</Text>
            </View>
            <Text style={styles.serviceName}>{item.item}</Text>
            <Text style={styles.serviceMeta}>{item.serviceType} · {item.duration}</Text>
            <View style={styles.cardActions}>
              <Pressable onPress={() => startEdit(item)} style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
                <MaterialIcons name="edit" color="#075985" size={17} />
                <Text style={styles.editButtonText}>Editar</Text>
              </Pressable>
              <Pressable onPress={() => askDelete(item.id, item.item)} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
                <MaterialIcons name="delete-outline" color="#B42318" size={18} />
              </Pressable>
            </View>
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 30 },
  navigation: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingTop: 12 },
  backButton: { alignItems: "center", backgroundColor: "#E0F2FE", borderRadius: 12, height: 38, justifyContent: "center", width: 38 },
  navigationTitle: { color: "#102A43", fontSize: 15, fontWeight: "800" },
  navigationSpacer: { width: 38 },
  eyebrow: { color: "#075985", fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginTop: 20 },
  title: { color: "#102A43", fontSize: 27, fontWeight: "800", letterSpacing: -0.5, lineHeight: 33, marginTop: 5 },
  subtitle: { color: "#526D82", fontSize: 14, lineHeight: 20, marginTop: 6 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  primaryAction: { alignItems: "center", backgroundColor: "#075985", borderRadius: 13, flex: 1, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 46 },
  primaryActionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  secondaryAction: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#BAE6FD", borderRadius: 13, borderWidth: 1, flexDirection: "row", gap: 6, justifyContent: "center", minWidth: 112 },
  secondaryActionText: { color: "#075985", fontSize: 13, fontWeight: "800" },
  status: { color: "#15803D", fontSize: 12, fontWeight: "700", marginTop: 11 },
  formCard: { backgroundColor: "#FFFFFF", borderColor: "#BAE6FD", borderRadius: 18, borderWidth: 1, marginTop: 18, padding: 16 },
  formTitleRow: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  formTitle: { color: "#102A43", fontSize: 17, fontWeight: "800" },
  formHelper: { color: "#526D82", fontSize: 12, lineHeight: 17, marginTop: 3, maxWidth: 260 },
  label: { color: "#334E68", fontSize: 12, fontWeight: "800", marginTop: 15 },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 8 },
  categoryOption: { backgroundColor: "#F7FAFC", borderColor: "#D9E2EC", borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  categoryOptionActive: { backgroundColor: "#075985", borderColor: "#075985" },
  categoryOptionText: { color: "#526D82", fontSize: 11, fontWeight: "800" },
  categoryOptionTextActive: { color: "#FFFFFF" },
  input: { backgroundColor: "#F7FAFC", borderColor: "#D9E2EC", borderRadius: 11, borderWidth: 1, color: "#102A43", fontSize: 14, marginTop: 7, minHeight: 44, paddingHorizontal: 11 },
  twoColumns: { flexDirection: "row", gap: 10 },
  fieldHalf: { flex: 1 },
  notesInput: { minHeight: 76, paddingTop: 10 },
  error: { color: "#B42318", fontSize: 12, fontWeight: "700", marginTop: 10 },
  saveButton: { alignItems: "center", backgroundColor: "#075985", borderRadius: 12, flexDirection: "row", gap: 7, justifyContent: "center", marginTop: 17, minHeight: 48 },
  saveButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  listHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10, marginTop: 22 },
  listTitle: { color: "#102A43", fontSize: 17, fontWeight: "800" },
  listCount: { color: "#526D82", fontSize: 12, fontWeight: "700" },
  serviceCard: { backgroundColor: "#FFFFFF", borderColor: "#D9E2EC", borderRadius: 16, borderWidth: 1, marginTop: 10, padding: 14 },
  serviceTopRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  categoryPill: { backgroundColor: "#E0F2FE", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  categoryText: { color: "#075985", fontSize: 10, fontWeight: "800" },
  servicePrice: { color: "#15803D", fontSize: 15, fontWeight: "900" },
  serviceName: { color: "#102A43", fontSize: 16, fontWeight: "800", marginTop: 11 },
  serviceMeta: { color: "#526D82", fontSize: 12, marginTop: 4 },
  cardActions: { flexDirection: "row", gap: 8, marginTop: 14 },
  editButton: { alignItems: "center", backgroundColor: "#E0F2FE", borderRadius: 10, flex: 1, flexDirection: "row", gap: 6, justifyContent: "center", minHeight: 38 },
  editButtonText: { color: "#075985", fontSize: 12, fontWeight: "800" },
  deleteButton: { alignItems: "center", backgroundColor: "#FEF2F2", borderRadius: 10, justifyContent: "center", width: 42 },
  pressed: { opacity: 0.7 },
  buttonPressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
});
