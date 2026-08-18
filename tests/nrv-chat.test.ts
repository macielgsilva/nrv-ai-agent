import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";

const llmMocks = vi.hoisted(() => ({
  invokeLLM: vi.fn(),
  listLLMModels: vi.fn(),
}));

vi.mock("../server/_core/llm", () => llmMocks);

import { appRouter } from "../server/routers";

const context = {
  req: { protocol: "https", headers: {} },
  res: { clearCookie: vi.fn() },
  user: null,
} as unknown as TrpcContext;

describe("nrv.chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a catalog-grounded assistant response when a preferred model is available", async () => {
    llmMocks.listLLMModels.mockResolvedValue({ data: [{ id: "gpt-5-mini" }] });
    llmMocks.invokeLLM.mockResolvedValue({
      choices: [{ message: { content: "A limpeza do sistema de refrigeração custa R$ 130,00." } }],
    });

    const caller = appRouter.createCaller(context);
    const result = await caller.nrv.chat({
      message: "Meu notebook esquenta muito.",
      history: [],
    });

    expect(result).toEqual({
      answer: "A limpeza do sistema de refrigeração custa R$ 130,00.",
      usedFallback: false,
    });
    expect(llmMocks.invokeLLM).toHaveBeenCalledOnce();
    expect(llmMocks.invokeLLM.mock.calls[0]?.[0]?.messages[0]?.content).toContain("Sistema de Refrigeração");
  });

  it("returns the safe contingency message when no preferred model is listed", async () => {
    llmMocks.listLLMModels.mockResolvedValue({ data: [{ id: "unavailable-model" }] });

    const caller = appRouter.createCaller(context);
    const result = await caller.nrv.chat({
      message: "Meu computador não liga.",
      history: [],
    });

    expect(result.usedFallback).toBe(true);
    expect(result.answer).toContain("análise em bancada por R$ 50,00");
    expect(llmMocks.invokeLLM).not.toHaveBeenCalled();
  });

  it("uses the catalog supplied by the administrative panel in the assistant context", async () => {
    llmMocks.listLLMModels.mockResolvedValue({ data: [{ id: "gpt-5-mini" }] });
    llmMocks.invokeLLM.mockResolvedValue({
      choices: [{ message: { content: "O diagnóstico de rede custa R$ 90,00." } }],
    });

    const caller = appRouter.createCaller(context);
    await caller.nrv.chat({
      message: "Minha rede não funciona.",
      history: [],
      catalog: [{
        id: "diagnostico-rede",
        category: "Manutenção",
        item: "Diagnóstico de Rede",
        serviceType: "Avaliação técnica",
        price: 90,
        duration: "1 dia útil",
        notes: "Inclui teste de conectividade.",
      }],
    });

    const systemPrompt = llmMocks.invokeLLM.mock.calls[0]?.[0]?.messages[0]?.content;
    expect(systemPrompt).toContain("Diagnóstico de Rede");
    expect(systemPrompt).not.toContain("Sistema de Refrigeração");
  });
});
