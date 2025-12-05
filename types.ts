
export interface SolarData {
  monthlyBill: number;
  yearlyConsumption: number; // kWh
  roofArea: number; // m2
  sunshineHours: number; // hours/year
  electricityPrice: number; // EUR/kWh
  inflationRate: number; // %
}

export interface SimulationParams {
  currentAnnualBill: number;
  yearlyConsumption: number; // Nouveau champ indispensable
  inflationRate: number;
  electricityPrice: number;
  
  installCost: number;
  yearlyProduction: number;
  selfConsumptionRate: number;
  
  creditMonthlyPayment: number;
  insuranceMonthlyPayment: number;
  creditDurationMonths: number;
  creditInterestRate: number; // Taux nominal %
}

export interface YearlyDetail {
  year: number;
  edfBillWithoutSolar: number;
  creditPayment: number;
  edfResidue: number;
  totalWithSolar: number;
  cumulativeSavings: number;
  cashflowDiff: number; // Monthly difference (Gain/Loss)
  cumulativeSpendNoSolar: number;
  cumulativeSpendSolar: number;
}

export interface SimulationResult {
  params: SimulationParams; // Raw data for local calculation
  salesPitch: string;
  psychologicalHook: string;
  co2Saved: number;
}

export interface ChartDataPoint {
  year: number;
  withSolar: number;
  withoutSolar: number;
  cumulativeSavings: number;
}

export enum AppState {
  UPLOAD = 'UPLOAD',
  ANALYZING = 'ANALYZING',
  DASHBOARD = 'DASHBOARD',
  ERROR = 'ERROR'
}
