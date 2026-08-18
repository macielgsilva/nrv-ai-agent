import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { useServices } from "@/lib/service-store";
import { trpc } from "@/lib/trpc";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  isFallback?: boolean;
};

const firstMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Olá! Sou o assistente da NRV. Conte o sintoma do seu equipamento para eu indicar os serviços e valores cadastrados.",
};

const suggestions = [
  "Meu notebook esquenta muito e desliga sozinho.",
  "Quanto custa instalar o Windows e salvar 200GB de fotos?",
];

export default function HomeScreen() {
  const router = useRouter();
  const chatMutation = trpc.nrv.chat.useMutation();
  const { services } = useServices();
  const inputRef = useRef<TextInput>(null);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([firstMessage]);

  const sendMessage = async (rawMessage?: string) => {
    const content = (rawMessage ?? draft).trim();
    if (!content || chatMutation.isPending) return;

    haptic.light();
    Keyboard.dismiss();
    const priorMessages = messages;
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    };
    setMessages((current) => [...current, userMessage]);
    setDraft("");

    try {
      const result = await chatMutation.mutateAsync({
        message: content,
        history: priorMessages.slice(-6).map((message) => ({
          role: message.role,
          content: message.content,
        })),
        catalog: services,
      });
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.answer,
          isFallback: result.usedFallback,
        },
      ]);
    } catch {
      haptic.error();
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: "Não foi possível concluir a consulta. Confira o catálogo de Serviços ou tente novamente em alguns instantes.",
          isFallback: true,
        },
      ]);
    }
  };

  return (
    <ScreenContainer containerClassName="bg-[#F7FAFC]" className="px-5">
      <FlatList
        data={messages}
        keyExtractor={(message) => message.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <View style={styles.topBar}>
              <View>
                <Text style={styles.eyebrow}>NRV INFORMÁTICA</Text>
                <Text style={styles.heading}>Atendimento que entende de tecnologia.</Text>
              </View>
              <Image source={require("../../assets/images/icon.png")} style={styles.logoMark} />
            </View>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}><MaterialIcons name="smart-toy" color="#075985" size={22} /></View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Pré-orçamento assistido</Text>
                <Text style={styles.heroText}>Conte o problema. O assistente consulta apenas a base de serviços NRV.</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Pergunte ao assistente</Text>
            <View style={styles.suggestionsRow}>
              <Pressable
                onPress={() => void sendMessage(suggestions[0])}
                style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
              >
                <MaterialIcons name="whatshot" size={16} color="#B45309" />
                <Text numberOfLines={2} style={styles.suggestionText}>Notebook aquece e desliga</Text>
              </Pressable>
              <Pressable
                onPress={() => void sendMessage(suggestions[1])}
                style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
              >
                <MaterialIcons name="backup" size={16} color="#075985" />
                <Text numberOfLines={2} style={styles.suggestionText}>Windows e backup</Text>
              </Pressable>
            </View>

            <View style={styles.chatLabelRow}>
              <Text style={styles.sectionTitle}>Conversa</Text>
              <Text style={styles.statusLabel}>Base NRV ativa</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.messageRow, item.role === "user" ? styles.userRow : styles.assistantRow]}>
            {item.role === "assistant" && <View style={styles.avatar}><MaterialIcons name="support-agent" size={15} color="#FFFFFF" /></View>}
            <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.assistantBubble]}>
              <Text style={[styles.messageText, item.role === "user" && styles.userMessageText]}>{item.content}</Text>
              {item.isFallback && <Text style={styles.fallbackText}>Consulta com contingência</Text>}
            </View>
          </View>
        )}
        ListFooterComponent={
          <View>
            {chatMutation.isPending && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#075985" />
                <Text style={styles.loadingText}>Consultando a base NRV…</Text>
              </View>
            )}
            <View style={styles.inputShell}>
              <TextInput
                ref={inputRef}
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={() => void sendMessage()}
                placeholder="Descreva o sintoma do equipamento"
                placeholderTextColor="#7B8794"
                returnKeyType="send"
                style={styles.input}
              />
              <Pressable
                disabled={!draft.trim() || chatMutation.isPending}
                onPress={() => void sendMessage()}
                style={({ pressed }) => [
                  styles.sendButton,
                  (!draft.trim() || chatMutation.isPending) && styles.sendButtonDisabled,
                  pressed && styles.buttonPressed,
                ]}
              >
                <MaterialIcons name="send" color="#FFFFFF" size={19} />
              </Pressable>
            </View>

            <Pressable onPress={() => router.push("/(tabs)/servicos")} style={({ pressed }) => [styles.catalogLink, pressed && styles.pressed]}>
              <MaterialIcons name="format-list-bulleted" color="#075985" size={18} />
              <Text style={styles.catalogLinkText}>Prefere consultar a tabela completa?</Text>
              <MaterialIcons name="chevron-right" color="#075985" size={18} />
            </Pressable>

            <View style={styles.disclaimer}>
              <MaterialIcons name="info-outline" color="#526D82" size={17} />
              <Text style={styles.disclaimerText}>O atendimento fornece um pré-orçamento. A confirmação depende de avaliação técnica.</Text>
            </View>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 28 },
  topBar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingTop: 14 },
  eyebrow: { color: "#075985", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  heading: { color: "#102A43", fontSize: 27, fontWeight: "800", letterSpacing: -0.6, lineHeight: 33, marginTop: 5, maxWidth: 260 },
  logoMark: { alignItems: "center", backgroundColor: "#075985", borderRadius: 16, height: 48, justifyContent: "center", width: 48 },
  heroCard: { alignItems: "flex-start", backgroundColor: "#E0F2FE", borderColor: "#BAE6FD", borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 12, marginTop: 22, padding: 15 },
  heroIcon: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, height: 42, justifyContent: "center", width: 42 },
  heroCopy: { flex: 1 },
  heroTitle: { color: "#075985", fontSize: 15, fontWeight: "800" },
  heroText: { color: "#334E68", fontSize: 13, lineHeight: 18, marginTop: 3 },
  sectionTitle: { color: "#102A43", fontSize: 17, fontWeight: "800", marginTop: 25 },
  suggestionsRow: { flexDirection: "row", gap: 10, marginTop: 11 },
  suggestion: { backgroundColor: "#FFFFFF", borderColor: "#D9E2EC", borderRadius: 14, borderWidth: 1, flex: 1, gap: 7, minHeight: 78, padding: 12 },
  suggestionText: { color: "#334E68", fontSize: 12, fontWeight: "700", lineHeight: 16 },
  chatLabelRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  statusLabel: { backgroundColor: "#DCFCE7", borderRadius: 999, color: "#15803D", fontSize: 11, fontWeight: "800", marginTop: 25, paddingHorizontal: 9, paddingVertical: 5 },
  messageRow: { alignItems: "flex-end", flexDirection: "row", marginTop: 13, maxWidth: "100%" },
  assistantRow: { justifyContent: "flex-start" },
  userRow: { justifyContent: "flex-end" },
  avatar: { alignItems: "center", backgroundColor: "#075985", borderRadius: 12, height: 24, justifyContent: "center", marginRight: 7, width: 24 },
  bubble: { borderRadius: 17, maxWidth: "83%", paddingHorizontal: 13, paddingVertical: 11 },
  assistantBubble: { backgroundColor: "#FFFFFF", borderBottomLeftRadius: 5 },
  userBubble: { backgroundColor: "#075985", borderBottomRightRadius: 5 },
  messageText: { color: "#243B53", fontSize: 14, lineHeight: 20 },
  userMessageText: { color: "#FFFFFF" },
  fallbackText: { color: "#B45309", fontSize: 10, fontWeight: "800", marginTop: 8, textTransform: "uppercase" },
  loadingRow: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 16, paddingLeft: 3 },
  loadingText: { color: "#526D82", fontSize: 13, fontWeight: "600" },
  inputShell: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#D9E2EC", borderRadius: 16, borderWidth: 1, flexDirection: "row", marginTop: 20, padding: 6 },
  input: { color: "#102A43", flex: 1, fontSize: 14, minHeight: 42, paddingHorizontal: 9 },
  sendButton: { alignItems: "center", backgroundColor: "#075985", borderRadius: 12, height: 42, justifyContent: "center", width: 42 },
  sendButtonDisabled: { backgroundColor: "#A0AEC0" },
  catalogLink: { alignItems: "center", flexDirection: "row", justifyContent: "center", marginTop: 18, paddingVertical: 8 },
  catalogLinkText: { color: "#075985", fontSize: 13, fontWeight: "800", marginHorizontal: 5 },
  disclaimer: { alignItems: "flex-start", backgroundColor: "#FFF7ED", borderRadius: 13, flexDirection: "row", gap: 8, marginTop: 14, padding: 12 },
  disclaimerText: { color: "#7C2D12", flex: 1, fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.72 },
  buttonPressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
});
