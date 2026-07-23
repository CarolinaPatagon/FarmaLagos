export interface PedidoSummary {
  id: number;
  nombre: string;
  fecha: string;
  archivoOriginal: string;
  importadoEn: string;
  totalLineas: number;
  totalUnidades: number;
  totalErrores: number;
}

export interface PedidoLineaRow {
  id: number;
  lineaNumero: number;
  codigoInterno: string;
  codigoBarras: string;
  nombreComercial: string;
  laboratorio: string;
  producto: string;
  unidades: number;
}

export interface PedidoDetail extends PedidoSummary {
  lineas: PedidoLineaRow[];
}

export interface RankingItem {
  clave: string;
  unidades: number;
  lineas: number;
}

export interface PedidoAnalysis {
  pedido: PedidoSummary;
  topProductos: RankingItem[];
  topLaboratorios: RankingItem[];
  productosUnicos: number;
  laboratoriosUnicos: number;
  unidadesPromedioPorLinea: number;
}

export interface OverviewData {
  totalPedidos: number;
  totalUnidadesHistorico: number;
  productosUnicosHistorico: number;
  laboratoriosUnicosHistorico: number;
  ultimoPedido: PedidoSummary | null;
  evolucion: { fecha: string; nombre: string; pedidoId: number; unidades: number; lineas: number }[];
  topProductosHistorico: RankingItem[];
  topLaboratoriosHistorico: RankingItem[];
}
