const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data.message.join(', ');
    return 'Request failed';
  } catch {
    return 'Request failed';
  }
}

async function api<T>(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as T;
}

export type ImportShipment = {
  id: string;
  srNo: number;
  status: 'OPEN' | 'CLOSED';
  supplierMasterId: string | null;
  purchaseOrderId: string | null;
  purchaseOrderNo: string;
  division: string;
  merchandiser: string;
  monthLabel: string;
  ppcDemandNo: string;
  ppcDemandDate: string | null;
  purchaseOrderDate: string | null;
  poQuantity: number;
  shipperName: string;
  productDescription: string;
  quantityShipped: number;
  unitValue: number;
  totalAmount: number;
  bank: string;
  paymentTerm: string;
  modeOfShipment: string;
  incoterm: string;
  supplierDeliveryTime: number | null;
  standardLeadTime: number;
  ppSampleReadyDate: string | null;
  actualShipmentReadyDate: string | null;
  onBoardDate: string | null;
  etaAtPort: string | null;
  blAwbNo: string;
  blDate: string | null;
  pol: string;
  destinationPort: string;
  modeOfClearance: string;
  eouLimitUtilized: string;
  fetaDate: string | null;
  revision1: string | null;
  revision2: string | null;
  revision3: string | null;
  factoryArrivalDelay: number | null;
  forwarder: string;
  clearingAgent: string;
  docToAgent: string;
  remarks: string;
  category: string;
  delayCause: string;
  qcReportReceivedDate: string | null;
  qcOrderQty: number;
  qcRejectedQty: number;
  qcLessQty: number;
  qcClaimDate: string | null;
  qcReportStandardDays: number;
  qcMaterialFinancialLoss: number;
  poClosedFromErp: boolean;
  bankName: string;
  bankTtLcNumber: string;
  bankDate: string | null;
  bankRoe: number;
  bankChargesAdvance: number;
  bankChargesLcOpening: number;
  bankChargesRetirement: number;
  bankDocsPayment: string;
  bankDocsFromBank: string | null;
  bankOaAdvanceSettlement: string;
  insuranceCompany: string;
  insuranceBillNo: string;
  insuranceDate: string | null;
  insuranceAmount: number;
  logisticsBillNo: string;
  logisticsDate: string | null;
  logisticsWeightCbm: string;
  logisticsAmount: number;
  logisticsBillToFinance: string | null;
  gdNo: string;
  gdDate: string | null;
  shipmentClearanceDate: string | null;
  clearanceBillNo: string;
  clearanceBillDate: string | null;
  clearanceAmount: number;
  // computed
  elapsedLeadTime?: number | null;
  remainingLeadTime?: number | null;
  poTat?: number | null;
  supplierDeliveryDate?: string | null;
  delayAgainstSupplier?: number | null;
  delay1to10?: number | null;
  delay10to20?: number | null;
  delayAgainstStandard?: number | null;
  delayStd1to10?: number | null;
  delayStd10to20?: number | null;
  qcReportReceivedDays?: number | null;
  qcDelay10to20?: number | null;
  qcDelay20to30?: number | null;
  bankChargesTotal?: number | null;
  company?: { id: string; code: string; name: string } | null;
};

export type MasterForIts = {
  id: string;
  srNo: number;
  purchaseOrderNo: string;
  shipperName: string;
  productDescription: string;
  alreadyInOpenIts: boolean;
};

export type ImportShipmentUpdate = Partial<
  Omit<
    ImportShipment,
    | 'id'
    | 'srNo'
    | 'status'
    | 'supplierMasterId'
    | 'purchaseOrderId'
    | 'fetaDate'
    | 'factoryArrivalDelay'
    | 'elapsedLeadTime'
    | 'remainingLeadTime'
    | 'poTat'
    | 'supplierDeliveryDate'
    | 'delayAgainstSupplier'
    | 'delay1to10'
    | 'delay10to20'
    | 'delayAgainstStandard'
    | 'delayStd1to10'
    | 'delayStd10to20'
    | 'qcReportReceivedDays'
    | 'qcDelay10to20'
    | 'qcDelay20to30'
    | 'bankChargesTotal'
    | 'company'
    | 'totalAmount'
  >
>;

export function listImportShipments(token: string, status: 'OPEN' | 'CLOSED' = 'OPEN') {
  return api<ImportShipment[]>(`/api/import-shipments?status=${status}`, token);
}

export function getImportShipment(token: string, id: string) {
  return api<ImportShipment>(`/api/import-shipments/${id}`, token);
}

export function updateImportShipment(
  token: string,
  id: string,
  body: ImportShipmentUpdate,
) {
  return api<ImportShipment>(`/api/import-shipments/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function postMasterToIts(token: string, masterId: string) {
  return api<ImportShipment>(`/api/import-shipments/from-master/${masterId}`, token, {
    method: 'POST',
  });
}

export function closeImportShipment(token: string, id: string) {
  return api<ImportShipment>(`/api/import-shipments/${id}/close`, token, {
    method: 'POST',
  });
}

export function deleteImportShipment(token: string, id: string) {
  return api<{ ok: boolean }>(`/api/import-shipments/${id}`, token, {
    method: 'DELETE',
  });
}

export function listMastersAvailableForIts(token: string) {
  return api<MasterForIts[]>(`/api/import-shipments/masters-available`, token);
}
