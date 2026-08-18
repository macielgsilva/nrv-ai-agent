import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TrpcContext } from "../server/_core/context";
import { NRV_SERVICES } from "../lib/nrv-catalog";
import { buildQuoteSummary, calculateQuoteTotal } from "../lib/quote-utils";

const llmMocks = vi.hoisted(() => ({
  invokeLLM: vi.fn(),
  listLLMModels: vi.fn(),
}));

vi.mock("../server/_core/llm", () => llmMocks);

import { appRouter } from "../server/routers";

const projectRoot = resolve(__dirname, "..");
const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(projectRoot, relativePath), "utf8");

const context = {
  req: { protocol: "https", headers: {} },
  res: { clearCookie: vi.fn() },
  user: null,
} as unknown as TrpcContext;

describe("skill rag-service-agent-mobile-oci — acceptance scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts the RAG diagnosis scenario with configurable model, safe env example, and complete dependencies", () => {
    const app = readProjectFile("app_corrigido.py");
    const readme = readProjectFile("README.md");
    const requirements = readProjectFile("requirements_corrigido.txt");

    expect(app).toContain('GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")');
    expect(app).toContain("create_retrieval_chain");
    expect(app).toContain("análise em bancada no valor de R$ 50,00");
    expect(readme).toContain("GOOGLE_API_KEY=sua_chave_privada");
    expect(readme).not.toMatch(/AIza[\w-]{20,}/);
    expect(requirements).toContain("langchain-google-genai");
    expect(requirements).toContain("langchain-chroma");
    expect(requirements).toContain("pandas");
    expect(requirements).toContain("openpyxl");
  });

  it("accepts the mobile catalog and pre-quote scenario with deterministic totals", () => {
    const windowsService = NRV_SERVICES.find(
      (service) => service.serviceType === "Formatação e Instalação",
    );
    const backupService = NRV_SERVICES.find((service) => service.item.includes("Backup"));

    expect(windowsService).toBeDefined();
    expect(backupService).toBeDefined();

    const items = [
      { service: windowsService!, quantity: 1 },
      { service: backupService!, quantity: 1 },
    ];
    const total = calculateQuoteTotal(items);
    const summary = buildQuoteSummary(items);

    expect(total).toBe(windowsService!.price + backupService!.price);
    expect(summary).toContain(windowsService!.item);
    expect(summary).toContain(backupService!.item);
    expect(summary).toContain("Total estimado");
  });

  it("accepts the administrative-catalog scenario by grounding the assistant in the supplied current table", async () => {
    llmMocks.listLLMModels.mockResolvedValue({ data: [{ id: "gpt-5-mini" }] });
    llmMocks.invokeLLM.mockResolvedValue({
      choices: [{ message: { content: "O diagnóstico de rede custa R$ 90,00." } }],
    });

    const currentCatalog = [{
      id: "diagnostico-rede",
      category: "Manutenção" as const,
      item: "Diagnóstico de Rede",
      serviceType: "Avaliação técnica",
      price: 90,
      duration: "1 dia útil",
      notes: "Inclui teste de conectividade.",
    }];

    const result = await appRouter.createCaller(context).nrv.chat({
      message: "Minha rede não funciona.",
      history: [],
      catalog: currentCatalog,
    });

    const systemPrompt = llmMocks.invokeLLM.mock.calls[0]?.[0]?.messages[0]?.content;
    expect(result).toEqual({
      answer: "O diagnóstico de rede custa R$ 90,00.",
      usedFallback: false,
    });
    expect(systemPrompt).toContain("Diagnóstico de Rede");
    expect(systemPrompt).toContain("R$ 90,00");
    expect(systemPrompt).not.toContain("Sistema de Refrigeração");
  });

  it("accepts the OCI deployment scenario by requiring localhost binding, restart policy, and reverse proxy", () => {
    const systemdTemplate = readProjectFile(
      "skills/rag-service-agent-mobile-oci/templates/streamlit-agent.service.tpl",
    );
    const nginxTemplate = readProjectFile(
      "skills/rag-service-agent-mobile-oci/templates/nginx-streamlit.conf.tpl",
    );
    const readme = readProjectFile("README.md");

    expect(systemdTemplate).toContain("EnvironmentFile=");
    expect(systemdTemplate).toContain("--server.address 127.0.0.1");
    expect(systemdTemplate).toContain("--server.port 8501");
    expect(systemdTemplate).toContain("Restart=on-failure");
    expect(nginxTemplate).toContain("proxy_pass http://127.0.0.1:8501");
    expect(nginxTemplate).toContain("proxy_set_header Upgrade");
    expect(readme).toContain("Checklist pós-deploy");
    expect(readme).toContain("Exemplos completos de entrada e saída");
  });
});
