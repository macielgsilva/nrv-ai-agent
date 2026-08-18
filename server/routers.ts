import { z } from "zod";

import { invokeLLM, listLLMModels } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { NRV_SERVICES } from "../lib/nrv-catalog";
import { COOKIE_NAME } from "../shared/const";

const serviceSchema = z.object({
  id: z.string().trim().min(1).max(100),
  category: z.enum(["Hardware", "Software", "Manutenção"]),
  item: z.string().trim().min(1).max(120),
  serviceType: z.string().trim().min(1).max(120),
  price: z.number().finite().min(0).max(100_000),
  duration: z.string().trim().min(1).max(100),
  notes: z.string().trim().max(500),
});

function makeCatalogContext(services = NRV_SERVICES) {
  return services.map(
    (service) =>
      `- ${service.item} | Categoria: ${service.category} | Serviço: ${service.serviceType} | Preço estimado: R$ ${service.price.toFixed(2).replace(".", ",")} | Prazo: ${service.duration} | Observações: ${service.notes || "Sem observações."}`,
  ).join("\n");
}

const chatInput = z.object({
  message: z.string().trim().min(2).max(1_000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(1_000),
      }),
    )
    .max(6)
    .default([]),
  catalog: z.array(serviceSchema).min(1).max(100).optional(),
});

function fallbackAnswer() {
  return "Não consegui consultar o assistente agora. Você pode navegar pelos Serviços para ver valores e prazos cadastrados, ou solicitar uma análise em bancada por R$ 50,00 para um diagnóstico técnico.";
}

export const appRouter = router({
  auth: router({
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        maxAge: -1,
        path: "/",
        sameSite: "none",
        secure: ctx.req.protocol === "https",
      });
      return { success: true } as const;
    }),
  }),
  system: systemRouter,
  health: publicProcedure.query(() => ({ status: "ok" })),
  nrv: router({
    chat: publicProcedure.input(chatInput).mutation(async ({ input }) => {
      try {
        const catalogContext = makeCatalogContext(input.catalog ?? NRV_SERVICES);
        const { data: models } = await listLLMModels();
        const preferredModels = ["gpt-5-mini", "claude-haiku-4-5", "gemini-3-flash-preview"];
        const model = preferredModels.find((candidate) => models.some((item) => item.id === candidate));

        if (!model) {
          return { answer: fallbackAnswer(), usedFallback: true };
        }

        const response = await invokeLLM({
          model,
          maxTokens: 500,
          messages: [
            {
              role: "system",
              content: `Você é o assistente de primeiro atendimento da NRV Informática. Responda em português do Brasil, de forma cordial, objetiva e profissional.

Use EXCLUSIVAMENTE os dados do catálogo abaixo para preços, prazos, garantias, peças e serviços. Nunca invente um valor, prazo, serviço, peça, diagnóstico ou procedimento. Não dê diagnóstico definitivo: apresente possibilidades e, se necessário, explique que é preciso avaliar o equipamento. Quando houver item compatível, informe preço e prazo como pré-orçamento sujeito a confirmação. Quando a pergunta não estiver coberta, diga que é necessária análise em bancada no valor de R$ 50,00. Se faltarem dados do sintoma, faça até duas perguntas diretas.

CATÁLOGO NRV:
${catalogContext}`,
            },
            ...input.history.map((message) => ({ role: message.role, content: message.content })),
            { role: "user" as const, content: input.message },
          ],
        });

        const rawAnswer = response.choices[0]?.message?.content;
        const answer = typeof rawAnswer === "string" ? rawAnswer.trim() : "";
        return { answer: answer || fallbackAnswer(), usedFallback: !answer };
      } catch {
        return { answer: fallbackAnswer(), usedFallback: true };
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
