export type ServiceCategory = "Hardware" | "Software" | "Manutenção";

export type NrvService = {
  id: string;
  category: ServiceCategory;
  item: string;
  serviceType: string;
  price: number;
  duration: string;
  notes: string;
};

export const NRV_SERVICES: NrvService[] = [
  {
    id: "tela-notebook-15-6",
    category: "Hardware",
    item: 'Tela de Notebook (15,6")',
    serviceType: "Substituição de peça",
    price: 350,
    duration: "2 a 3 dias úteis",
    notes: "Garantia de 90 dias.",
  },
  {
    id: "teclado-notebook",
    category: "Hardware",
    item: "Teclado de Notebook",
    serviceType: "Substituição de peça",
    price: 180,
    duration: "1 a 2 dias úteis",
    notes: "Sujeito à disponibilidade.",
  },
  {
    id: "bateria-notebook",
    category: "Hardware",
    item: "Bateria de Notebook",
    serviceType: "Substituição de peça",
    price: 250,
    duration: "2 dias úteis",
    notes: "Baterias compatíveis ou originais.",
  },
  {
    id: "memoria-ram-8gb-ddr4",
    category: "Hardware",
    item: "Memória RAM (8GB DDR4)",
    serviceType: "Upgrade/Troca",
    price: 200,
    duration: "1 dia útil",
    notes: "Ideal para desempenho.",
  },
  {
    id: "ssd-512gb-nvme",
    category: "Hardware",
    item: "SSD (512GB NVMe)",
    serviceType: "Upgrade/Troca",
    price: 320,
    duration: "1 a 2 dias úteis",
    notes: "Inclui clonagem do sistema.",
  },
  {
    id: "sistema-operacional",
    category: "Software",
    item: "Sistema Operacional",
    serviceType: "Formatação e Instalação",
    price: 150,
    duration: "1 dia útil",
    notes: "Windows ou Linux. Sem backup.",
  },
  {
    id: "backup-dados",
    category: "Software",
    item: "Backup de Dados",
    serviceType: "Salvamento até 500GB",
    price: 100,
    duration: "1 a 2 dias úteis",
    notes: "Preço base. Adicional por TB.",
  },
  {
    id: "remocao-virus",
    category: "Software",
    item: "Remoção de Vírus",
    serviceType: "Limpeza de Sistema",
    price: 120,
    duration: "1 dia útil",
    notes: "Inclui antivírus básico.",
  },
  {
    id: "refrigeracao",
    category: "Manutenção",
    item: "Sistema de Refrigeração",
    serviceType: "Limpeza e Pasta Térmica",
    price: 130,
    duration: "1 dia útil",
    notes: "Recomendado a cada 12 meses.",
  },
  {
    id: "placa-mae",
    category: "Manutenção",
    item: "Placa-mãe",
    serviceType: "Reparo de Componentes",
    price: 450,
    duration: "5 a 7 dias úteis",
    notes: "Varia após análise avançada.",
  },
];

export const SERVICE_CATEGORIES: Array<ServiceCategory | "Todos"> = [
  "Todos",
  "Hardware",
  "Software",
  "Manutenção",
];

export function getServiceById(id: string | undefined) {
  return NRV_SERVICES.find((service) => service.id === id);
}
