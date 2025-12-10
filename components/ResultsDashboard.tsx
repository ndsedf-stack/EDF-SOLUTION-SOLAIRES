import React, { useState, useEffect, useMemo } from 'react';
import { SimulationResult, YearlyDetail } from '../types';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Label, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Wallet, Zap, TrendingUp, TrendingDown, Sun, ShieldAlert, Flame, Lock, Timer, PiggyBank, Landmark, Table2, Info, Calendar, Scale, Crown, Ban, Wrench, Truck, CheckCircle2, Eye, CalendarDays, Coins, ArrowRight, HelpCircle, AlertTriangle, Edit3, Settings, DollarSign, TrendingDown as TrendDown, Clock, Target, Award, Users, Home, CreditCard, Banknote } from 'lucide-react';

interface ResultsDashboardProps {
  data: SimulationResult;
  onReset: () => void;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ data, onReset }) => {
  // ==================== ÉTATS ÉDITABLES ====================
  const [inflationRate, setInflationRate] = useState<number>(Number(data.params.inflationRate) || 5);
  const [projectionYears, setProjectionYears] = useState(20);
  
  const [electricityPrice, setElectricityPrice] = useState<number>(Number(data.params.electricityPrice) || 0.25);
  const [yearlyProduction, setYearlyProduction] = useState<number>(Number(data.params.yearlyProduction) || 0);
  const [selfConsumptionRate, setSelfConsumptionRate] = useState<number>(Number(data.params.selfConsumptionRate) || 70);
  const [installCost, setInstallCost] = useState<number>(Number(data.params.installCost) || 20000);
  const [creditMonthlyPayment, setCreditMonthlyPayment] = useState<number>(Number(data.params.creditMonthlyPayment) || 0);
  const [insuranceMonthlyPayment, setInsuranceMonthlyPayment] = useState<number>(Number(data.params.insuranceMonthlyPayment) || 0);
  const [creditDurationMonths, setCreditDurationMonths] = useState<number>(Number(data.params.creditDurationMonths) || 180);
  
  // États UI
  const [wastedCash, setWastedCash] = useState(0);
  const [showInactionInfo, setShowInactionInfo] = useState(false);
  const [tableView, setTableView] = useState<'yearly' | 'monthly'>('yearly');
  const [showParamsEditor, setShowParamsEditor] = useState(false);
  const [premiumWarranty, setPremiumWarranty] = useState(true); // Performance par défaut (TVA 20%)

  // ==================== MOTEUR DE CALCUL FINANCIER ====================
  const calculationResult = useMemo(() => {
    const currentAnnualBill = Number(data.params.currentAnnualBill) || 0;
    const yearlyConsumption = Number(data.params.yearlyConsumption) || 0;
    
    const localElectricityPrice = Number(electricityPrice);
    const localYearlyProduction = Number(yearlyProduction);
    const localSelfConsumptionRate = Number(selfConsumptionRate);
    const localCreditMonthlyPayment = Number(creditMonthlyPayment);
    const localInsuranceMonthlyPayment = Number(insuranceMonthlyPayment);
    const localCreditDurationMonths = Number(creditDurationMonths);
    const localInstallCost = Number(installCost);
    const localInflation = Number(inflationRate);

    const startYear = new Date().getFullYear();
    const details: YearlyDetail[] = [];
    
    const baseConsumptionKwh = yearlyConsumption > 0 
      ? yearlyConsumption 
      : (localElectricityPrice > 0 ? currentAnnualBill / localElectricityPrice : 0);
    
    const selfConsumedKwh = localYearlyProduction * (localSelfConsumptionRate / 100);
    const savingsRatePercent = baseConsumptionKwh > 0 
      ? Math.min(100, (selfConsumedKwh / baseConsumptionKwh) * 100) 
      : 0;

    let cumulativeSavings = 0;
    let cumulativeWithout = 0;
    let cumulativeWith = 0;

    for (let i = 0; i < 30; i++) {
      const year = startYear + i;
      const currentElectricityPrice = localElectricityPrice * Math.pow(1 + localInflation / 100, i);
      const billWithoutSolar = baseConsumptionKwh * currentElectricityPrice;
      const savingsInEuros = selfConsumedKwh * currentElectricityPrice;
      const residuaryBill = Math.max(0, billWithoutSolar - savingsInEuros);
      const isCreditActive = (i * 12) < localCreditDurationMonths;
      const creditCostYearly = isCreditActive 
        ? (localCreditMonthlyPayment + localInsuranceMonthlyPayment) * 12 
        : 0;
      const totalDecaissé = residuaryBill + creditCostYearly;
      const yearlySaving = billWithoutSolar - totalDecaissé; 
      
      cumulativeSavings += yearlySaving;
      cumulativeWithout += billWithoutSolar;
      cumulativeWith += totalDecaissé;

      details.push({
        year,
        edfBillWithoutSolar: billWithoutSolar,
        creditPayment: creditCostYearly,
        edfResidue: residuaryBill,
        totalWithSolar: totalDecaissé,
        cumulativeSavings: cumulativeSavings,
        cumulativeSpendNoSolar: cumulativeWithout,
        cumulativeSpendSolar: cumulativeWith,
        cashflowDiff: yearlySaving 
      });
    }

    const slicedDetails = details.slice(0, projectionYears);
    const totalSavingsProjected = slicedDetails[slicedDetails.length - 1].cumulativeSavings;
    const totalSpendNoSolar = slicedDetails[slicedDetails.length - 1].cumulativeSpendNoSolar;
    const totalSpendSolar = slicedDetails[slicedDetails.length - 1].cumulativeSpendSolar;
    
    const breakEvenYearIndex = details.findIndex(d => d.cumulativeSavings > 0);
    const breakEvenPoint = breakEvenYearIndex !== -1 ? breakEvenYearIndex + 1 : 30;
    
    const year1 = details[0];
    const newMonthlyBillYear1 = year1.totalWithSolar / 12;
    const oldMonthlyBillYear1 = year1.edfBillWithoutSolar / 12;
    const monthlyEffortYear1 = newMonthlyBillYear1 - oldMonthlyBillYear1;
    
    const averageYearlyGain = projectionYears > 0 ? totalSavingsProjected / projectionYears : 0;
    const costOfInactionPerSecond = Math.max(0.0001, averageYearlyGain / (365 * 24 * 3600));
    const effectiveCost = localInstallCost > 0 ? localInstallCost : 20000; 
    const roiPercentage = effectiveCost > 0 
      ? ((totalSavingsProjected / projectionYears) / effectiveCost) * 100 
      : 0;
    const bankEquivalentCapital = averageYearlyGain / 0.03;

    // ===== CALCUL SCÉNARIO CASH (Sans Crédit) =====
    let cumulativeSavingsCash = -localInstallCost;
    const detailsCash: YearlyDetail[] = [];
    
    for (let i = 0; i < 30; i++) {
      const year = startYear + i;
      const currentElectricityPrice = localElectricityPrice * Math.pow(1 + localInflation / 100, i);
      const billWithoutSolar = baseConsumptionKwh * currentElectricityPrice;
      const savingsInEuros = selfConsumedKwh * currentElectricityPrice;
      const residuaryBill = Math.max(0, billWithoutSolar - savingsInEuros);
      
      const yearlySavingCash = billWithoutSolar - residuaryBill;
      cumulativeSavingsCash += yearlySavingCash;

      detailsCash.push({
        year,
        edfBillWithoutSolar: billWithoutSolar,
        creditPayment: 0,
        edfResidue: residuaryBill,
        totalWithSolar: residuaryBill,
        cumulativeSavings: cumulativeSavingsCash,
        cumulativeSpendNoSolar: 0,
        cumulativeSpendSolar: 0,
        cashflowDiff: yearlySavingCash
      });
    }

    const slicedDetailsCash = detailsCash.slice(0, projectionYears);
    const totalSavingsProjectedCash = slicedDetailsCash[slicedDetailsCash.length - 1].cumulativeSavings;
    const breakEvenYearIndexCash = detailsCash.findIndex(d => d.cumulativeSavings > 0);
    const breakEvenPointCash = breakEvenYearIndexCash !== -1 ? breakEvenYearIndexCash + 1 : 30;
    const averageYearlyGainCash = projectionYears > 0 ? totalSavingsProjectedCash / projectionYears : 0;
    const roiPercentageCash = effectiveCost > 0 
      ? ((totalSavingsProjectedCash / projectionYears) / effectiveCost) * 100 
      : 0;

    // ===== CALCUL "ET SI J'ATTENDS 1 AN DE PLUS?" =====
    const priceNextYear = localElectricityPrice * Math.pow(1 + localInflation / 100, 1);
    const lossIfWait1Year = baseConsumptionKwh * priceNextYear;
    const savingsLostIfWait1Year = selfConsumedKwh * priceNextYear;

    return { 
      details, 
      slicedDetails,
      totalSavingsProjected, 
      totalSpendNoSolar,
      totalSpendSolar,
      breakEvenPoint, 
      costOfInactionPerSecond,
      averageYearlyGain,
      newMonthlyBillYear1,
      oldMonthlyBillYear1,
      monthlyEffortYear1,
      year1,
      roiPercentage,
      bankEquivalentCapital,
      savingsRatePercent,
      baseConsumptionKwh,
      installCost: localInstallCost,
      detailsCash,
      slicedDetailsCash,
      totalSavingsProjectedCash,
      breakEvenPointCash,
      averageYearlyGainCash,
      roiPercentageCash,
      lossIfWait1Year,
      savingsLostIfWait1Year
    };
  }, [
    data.params, 
    inflationRate, 
    projectionYears, 
    electricityPrice, 
    yearlyProduction, 
    selfConsumptionRate, 
    installCost,
    creditMonthlyPayment,
    insuranceMonthlyPayment,
    creditDurationMonths
  ]);

  // Animation "Wasted Cash"
  useEffect(() => {
    setWastedCash(0);
    const interval = setInterval(() => {
      setWastedCash(prev => prev + calculationResult.costOfInactionPerSecond * 100); 
    }, 100); 
    return () => clearInterval(interval);
  }, [calculationResult.costOfInactionPerSecond]);

  const formatEUR = (num: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(num);
  const formatMoney = (num: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(num);
  const formatKwh = (num: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(num);

  const maxSpend = Math.max(calculationResult.totalSpendNoSolar, calculationResult.totalSpendSolar) || 1;
  const percentNoSolar = (calculationResult.totalSpendNoSolar / maxSpend) * 100;
  const percentSolar = (calculationResult.totalSpendSolar / maxSpend) * 100;

  return (
    <div className="min-h-screen bg-[#000000] text-white font-sans selection:bg-blue-500 selection:text-black pb-20">
      
      {/* --- HEADER FLOTTANT --- */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.6)]">
               <Zap className="text-white w-5 h-5 fill-white" />
            </div>
            <div className="leading-none">
              <span className="block font-black text-xl tracking-tighter text-white">EDF <span className="text-blue-500">SOLAIRES</span></span>
              <span className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">Analyse Financière Premium</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowParamsEditor(!showParamsEditor)}
              className="text-xs font-bold text-zinc-500 hover:text-blue-400 uppercase tracking-widest transition-colors flex items-center gap-2 bg-zinc-900/50 px-4 py-2 rounded-xl border border-white/10"
            >
              <Settings className="w-4 h-4" /> Modifier
            </button>
            <button onClick={onReset} className="text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Nouvelle Analyse
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 pt-28 space-y-10">

        {/* ==================== PANNEAU D'ÉDITION DES PARAMÈTRES ==================== */}
        {showParamsEditor && (
          <div className="bg-gradient-to-br from-blue-900/20 to-black border-2 border-blue-500/40 rounded-[32px] p-8 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Edit3 className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-2xl font-black text-white">PARAMÈTRES FINANCIERS</h2>
              </div>
              <button 
                onClick={() => setShowParamsEditor(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Prix Électricité (€/kWh)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={electricityPrice}
                  onChange={(e) => setElectricityPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-white/20 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-zinc-600 mt-2">Tarif actuel du kWh chez votre fournisseur</p>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                  <Sun className="w-4 h-4 text-orange-500" />
                  Production Annuelle (kWh)
                </label>
                <input
                  type="number"
                  step="100"
                  value={yearlyProduction}
                  onChange={(e) => setYearlyProduction(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-white/20 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-zinc-600 mt-2">kWh produits par vos panneaux/an</p>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Taux Autoconsommation (%)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={selfConsumptionRate}
                  onChange={(e) => setSelfConsumptionRate(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-white/20 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-zinc-600 mt-2">% de production consommée directement</p>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-purple-500" />
                  Coût Installation (€)
                </label>
                <input
                  type="number"
                  step="1000"
                  value={installCost}
                  onChange={(e) => setInstallCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-white/20 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-zinc-600 mt-2">Prix total TTC du projet</p>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                  <Coins className="w-4 h-4 text-blue-500" />
                  Mensualité Crédit (€)
                </label>
                <input
                  type="number"
                  step="10"
                  value={creditMonthlyPayment}
                  onChange={(e) => setCreditMonthlyPayment(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-white/20 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-zinc-600 mt-2">Montant mensuel du prêt</p>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  Assurance (€/mois)
                </label>
                <input
                  type="number"
                  step="1"
                  value={insuranceMonthlyPayment}
                  onChange={(e) => setInsuranceMonthlyPayment(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-white/20 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-zinc-600 mt-2">Assurance emprunteur mensuelle</p>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-2xl p-4 md:col-span-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                  <Timer className="w-4 h-4 text-red-500" />
                  Durée Crédit (mois)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="12"
                    value={creditDurationMonths}
                    onChange={(e) => setCreditDurationMonths(parseFloat(e.target.value) || 0)}
                    className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span className="text-2xl font-black text-white tabular-nums w-20 text-right">
                    {creditDurationMonths} <span className="text-sm text-zinc-500">mois</span>
                  </span>
                </div>
                <p className="text-[10px] text-zinc-600 mt-2">Soit {(creditDurationMonths / 12).toFixed(1)} années de remboursement</p>
              </div>

            </div>

            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-sm text-blue-300 flex items-center gap-2">
                <Info className="w-4 h-4" />
                <span>Les graphiques et calculs se mettent à jour automatiquement.</span>
              </p>
            </div>
          </div>
        )}

         {/* ==================== ALERTE PSYCHOLOGIQUE : COÛT DE L'ATTENTE ==================== */}
         <div className="bg-gradient-to-r from-red-900/30 to-orange-900/20 border-2 border-red-500/40 rounded-[32px] p-6 relative overflow-hidden">
           <div className="absolute top-0 right-0 opacity-5">
             <Clock className="w-64 h-64 text-red-500" />
           </div>
           <div className="relative z-10">
             <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
               <div className="flex-1">
                 <div className="flex items-center gap-3 mb-4">
                   <div className="p-3 bg-red-500/20 rounded-xl">
                     <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />
                   </div>
                   <div>
                     <h3 className="text-2xl font-black text-white">ET SI JE NE FAIS RIEN ?</h3>
                     <p className="text-red-300 text-sm">Voici ce qui se passe si vous attendez "juste" 1 an de plus...</p>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="bg-black/40 rounded-xl p-4 border border-red-500/20">
                     <div className="text-xs text-red-400 uppercase font-bold tracking-wider mb-2">💸 Facture Perdue (1 an)</div>
                     <div className="text-3xl font-black text-white mb-1">{formatEUR(calculationResult.lossIfWait1Year)}</div>
                     <div className="text-xs text-zinc-500">Argent parti chez votre fournisseur</div>
                   </div>
                   <div className="bg-black/40 rounded-xl p-4 border border-red-500/20">
                     <div className="text-xs text-red-400 uppercase font-bold tracking-wider mb-2">⚡ Économies Ratées</div>
                     <div className="text-3xl font-black text-white mb-1">{formatEUR(calculationResult.savingsLostIfWait1Year)}</div>
                     <div className="text-xs text-zinc-500">Ce que vous auriez économisé</div>
                   </div>
                 </div>
               </div>

               <div className="bg-black/60 rounded-2xl p-6 border border-red-500/30 text-center min-w-[280px]">
                 <div className="text-xs text-red-400 uppercase font-bold tracking-wider mb-2">⏱️ Chaque Seconde d'Hésitation</div>
                 <div className="text-5xl font-mono font-black text-red-500 tabular-nums mb-2">
                   -{wastedCash.toFixed(2)} €
                 </div>
                 <div className="text-xs text-zinc-500 mb-4">...s'envole pendant que vous lisez cette page</div>
                 <div className="text-[10px] bg-red-500/10 text-red-300 px-3 py-1 rounded-full inline-block font-bold border border-red-500/20">
                   LE MEILLEUR MOMENT ? C'ÉTAIT HIER.
                 </div>
               </div>
             </div>
           </div>
         </div>

        {/* --- DURATION SELECTOR --- */}
        <div className="flex justify-center">
           <div className="bg-zinc-900/80 p-1.5 rounded-2xl border border-white/10 flex gap-2 overflow-x-auto">
              {[10, 15, 20, 25].map((y) => (
                <button 
                  key={y}
                  onClick={() => setProjectionYears(y)}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${projectionYears === y ? 'bg-blue-600 text-white shadow-lg scale-105' : 'text-zinc-500 hover:bg-white/5 hover:text-white'}`}
                >
                  {y} ANS
                </button>
              ))}
           </div>
        </div>

        {/* --- INDICATEUR TAUX D'ÉCONOMIE --- */}
        <div className="bg-gradient-to-r from-emerald-900/40 to-black border border-emerald-500/30 rounded-[32px] p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
             <div className="relative z-10 flex items-center gap-6">
                 <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90 filter drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                      <circle cx="72" cy="72" r="60" fill="transparent" stroke="#064e3b" strokeWidth="8" />
                      <circle 
                        cx="72" cy="72" r="60" fill="transparent" stroke="#10b981" strokeWidth="8" 
                        strokeLinecap="round"
                        strokeDasharray={377} 
                        strokeDashoffset={377 - (377 * calculationResult.savingsRatePercent) / 100} 
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <Zap className="w-6 h-6 text-emerald-400 fill-emerald-400 mb-1" />
                       <span className="text-3xl font-black text-white">{calculationResult.savingsRatePercent.toFixed(0)}%</span>
                       <span className="text-[9px] font-bold text-emerald-500 uppercase">Autonomie</span>
                    </div>
                 </div>
                 
                 <div>
                    <h2 className="text-3xl md:text-4xl font-black text-white mb-2">AUTONOMIE ÉNERGÉTIQUE</h2>
                    <p className="text-emerald-400 font-bold text-lg">Vous effacez {calculationResult.savingsRatePercent.toFixed(0)}% de votre facture d'électricité.</p>
                    <p className="text-zinc-500 text-sm mt-1">Sur une consommation de <span className="text-white font-bold">{formatKwh(calculationResult.baseConsumptionKwh)} kWh/an</span></p>
                    <p className="text-emerald-500/80 text-xs mt-2 italic">💡 Pendant que vos voisins regardent leur facture grimper, la vôtre fond.</p>
                 </div>
             </div>
             <div className="relative z-10 bg-emerald-500/10 px-6 py-4 rounded-2xl border border-emerald-500/20 text-center md:text-right min-w-[200px]">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Gain Total Projeté</div>
                <div className="text-4xl font-black text-white tracking-tighter">{formatEUR(calculationResult.totalSavingsProjected)}</div>
             </div>
        </div>

        {/* ==================== GRAPHIQUE : RÉPARTITION ÉNERGIE ==================== */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-[32px] p-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-6 h-6 text-yellow-500" />
            <h2 className="text-2xl font-black text-white">RÉPARTITION ÉNERGIE</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* GRAPHIQUE CIRCULAIRE */}
            <div className="relative">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <defs>
                    <linearGradient id="autoconsoGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                    <linearGradient id="venteGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#7e22ce" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={[
                      { 
                        name: 'Autoconso.', 
                        value: yearlyProduction * (selfConsumptionRate / 100),
                        fill: 'url(#autoconsoGradient)'
                      },
                      { 
                        name: 'Vente', 
                        value: yearlyProduction * (1 - selfConsumptionRate / 100),
                        fill: 'url(#venteGradient)'
                      }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Label 
                      value="TOTAL" 
                      position="center" 
                      dy={-10}
                      style={{ fontSize: '12px', fill: '#71717a', fontWeight: 'bold' }}
                    />
                    <Label 
                      value={`${formatKwh(yearlyProduction)}`} 
                      position="center" 
                      style={{ fontSize: '32px', fontWeight: 'bold', fill: '#fff' }}
                    />
                    <Label 
                      value="kWh/an" 
                      position="center" 
                      dy={25}
                      style={{ fontSize: '14px', fill: '#71717a' }}
                    />
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `${formatKwh(value)} kWh`}
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      border: '1px solid #3f3f46',
                      borderRadius: '8px',
                      fontSize: '13px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* LÉGENDE ET EXPLICATIONS */}
            <div className="space-y-6">
              {/* Autoconsommation */}
              <div className="bg-gradient-to-r from-orange-900/20 to-black border border-orange-500/30 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-500 to-orange-600"></div>
                  <h3 className="text-lg font-bold text-white">Autoconso.</h3>
                </div>
                <div className="text-3xl font-black text-orange-400 mb-2">
                  {formatKwh(yearlyProduction * (selfConsumptionRate / 100))} kWh
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  💡 L'électricité que vous <span className="text-white font-bold">consommez directement</span> depuis vos panneaux. 
                  <span className="text-orange-400 font-bold"> Vous ne payez PAS ces kWh au fournisseur.</span>
                </p>
              </div>

              {/* Vente */}
              <div className="bg-gradient-to-r from-purple-900/20 to-black border border-purple-500/30 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-500 to-purple-600"></div>
                  <h3 className="text-lg font-bold text-white">Vente (Surplus)</h3>
                </div>
                <div className="text-3xl font-black text-purple-400 mb-2">
                  {formatKwh(yearlyProduction * (1 - selfConsumptionRate / 100))} kWh
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  ⚡ Le surplus vendu au réseau. EDF vous le rachète à un tarif garanti pendant 20 ans 
                  (environ <span className="text-white font-bold">0.10€/kWh</span>).
                </p>
              </div>
            </div>
          </div>

          {/* RÉSUMÉ BAS */}
          <div className="mt-8 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <p className="text-sm text-blue-300 flex items-start gap-2">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <span>
                <span className="font-bold text-white">Votre stratégie :</span> Maximiser l'autoconsommation 
                ({selfConsumptionRate}%) pour économiser, et vendre le reste pour générer un complément de revenu.
              </span>
            </p>
          </div>
        </div>

        {/* ==================== COMPARAISON FINANCEMENT VS CASH (TOUJOURS VISIBLE) ==================== */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-[32px] p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-3 mb-2">
                <DollarSign className="text-emerald-500" /> FINANCEMENT VS PAIEMENT CASH
              </h2>
              <p className="text-zinc-500 text-sm">Quel mode de paiement maximise votre retour sur investissement ?</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PARTIE 2 - SUITE DU FICHIER */}
            
            {/* OPTION 1 : FINANCEMENT */}
            <div className="bg-gradient-to-br from-blue-900/30 to-black border-2 border-blue-500/40 rounded-[24px] p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <CreditCard className="w-32 h-32 text-blue-500" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-blue-500/20 rounded-xl">
                    <CreditCard className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">AVEC FINANCEMENT</h3>
                    <p className="text-blue-300 text-sm">Étalement de la charge</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center p-3 bg-black/40 rounded-xl">
                    <span className="text-xs text-zinc-400 uppercase font-bold">Gain Total ({projectionYears} ans)</span>
                    <span className="text-lg font-black text-white">{formatEUR(calculationResult.totalSavingsProjected)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-black/40 rounded-xl">
                    <span className="text-xs text-zinc-400 uppercase font-bold">Point Mort</span>
                    <span className="text-lg font-black text-blue-400">{calculationResult.breakEvenPoint} ans</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-black/40 rounded-xl">
                    <span className="text-xs text-zinc-400 uppercase font-bold">ROI Annuel</span>
                    <span className="text-lg font-black text-emerald-400">+{calculationResult.roiPercentage.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-blue-400 uppercase mb-2">✅ Avantages</h4>
                  <ul className="space-y-2 text-xs text-zinc-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Aucun cash bloqué - Vous gardez votre épargne liquide</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Effort mensuel maîtrisé ({formatMoney(Math.abs(calculationResult.monthlyEffortYear1))})</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Vous profitez immédiatement des économies</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* OPTION 2 : CASH */}
            <div className="bg-gradient-to-br from-emerald-900/30 to-black border-2 border-emerald-500/40 rounded-[24px] p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Banknote className="w-32 h-32 text-emerald-500" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-emerald-500/20 rounded-xl">
                    <Banknote className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">PAIEMENT CASH</h3>
                    <p className="text-emerald-300 text-sm">Rentabilité maximale</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center p-3 bg-black/40 rounded-xl">
                    <span className="text-xs text-zinc-400 uppercase font-bold">Gain Total ({projectionYears} ans)</span>
                    <span className="text-lg font-black text-emerald-400">{formatEUR(calculationResult.totalSavingsProjectedCash)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-black/40 rounded-xl">
                    <span className="text-xs text-zinc-400 uppercase font-bold">Point Mort</span>
                    <span className="text-lg font-black text-emerald-400">{calculationResult.breakEvenPointCash} ans</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-black/40 rounded-xl">
                    <span className="text-xs text-zinc-400 uppercase font-bold">ROI Annuel</span>
                    <span className="text-lg font-black text-emerald-400">+{calculationResult.roiPercentageCash.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase mb-2">✅ Avantages</h4>
                  <ul className="space-y-2 text-xs text-zinc-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>ROI supérieur (+{(calculationResult.roiPercentageCash - calculationResult.roiPercentage).toFixed(1)}% vs crédit)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Point mort plus rapide ({calculationResult.breakEvenPointCash} ans vs {calculationResult.breakEvenPoint})</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Pas d'intérêts bancaires - 100% des économies pour vous</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

          </div>

          {/* VERDICT */}
          <div className="mt-6 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-purple-400" />
              <h4 className="text-lg font-black text-white">💡 LE VERDICT DU CONSEILLER</h4>
            </div>
            <p className="text-zinc-300 text-sm leading-relaxed">
              <span className="text-emerald-400 font-bold">Cash optimal</span> si vous avez l'épargne disponible (+{formatEUR(calculationResult.totalSavingsProjectedCash - calculationResult.totalSavingsProjected)} de gain sur {projectionYears} ans). 
              <span className="text-blue-400 font-bold"> Financement intelligent</span> si vous préférez garder votre trésorerie liquide pour d'autres projets. 
              <span className="text-white font-bold"> Dans les deux cas, vous gagnez.</span> La vraie perte ? C'est de ne rien faire.
            </p>
          </div>
        </div>

        {/* ==================== TIMELINE VISUELLE : VOTRE ARGENT DANS 5-10-20 ANS ==================== */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-[32px] p-8">
          <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
            <Clock className="text-blue-500" /> OÙ SERA VOTRE ARGENT ?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { year: 5, color: 'orange' },
              { year: 10, color: 'blue' },
              { year: 20, color: 'emerald' }
            ].map(({year, color}) => {
              const detail = calculationResult.details[year - 1];
              const detailCash = calculationResult.detailsCash[year - 1];
              
              return (
                <div key={year} className={`bg-gradient-to-br from-${color}-900/20 to-black border border-${color}-500/30 rounded-2xl p-6 relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 text-[120px] font-black text-white/5 leading-none pr-4 pt-2">
                    {year}
                  </div>
                  <div className="relative z-10">
                    <div className={`text-${color}-400 text-sm font-bold uppercase tracking-wider mb-4`}>
                      Dans {year} ans
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      <div className="bg-black/40 rounded-xl p-3">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Avec Solaire (Crédit)</div>
                        <div className={`text-2xl font-black ${detail.cumulativeSavings > 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                          {formatEUR(detail.cumulativeSavings)}
                        </div>
                      </div>
                      
                      <div className="bg-black/40 rounded-xl p-3">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Avec Solaire (Cash)</div>
                        <div className={`text-2xl font-black ${detailCash.cumulativeSavings > 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                          {formatEUR(detailCash.cumulativeSavings)}
                        </div>
                      </div>
                      
                      <div className="bg-red-950/30 rounded-xl p-3 border border-red-500/20">
                        <div className="text-[10px] text-red-400 uppercase font-bold mb-1">Sans Rien Faire</div>
                        <div className="text-2xl font-black text-red-500">
                          -{formatEUR(detail.cumulativeSpendNoSolar)}
                        </div>
                      </div>
                    </div>
                    
                    <div className={`text-xs text-${color}-300/80 italic`}>
                      {year === 5 && "Vous commencez à voir la différence"}
                      {year === 10 && "L'écart se creuse significativement"}
                      {year === 20 && "C'est un capital transmissible"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ==================== COMPARAISON AVEC AUTRES PLACEMENTS ==================== */}
        <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-[32px] p-8">
          <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
            <Award className="text-yellow-500" /> COMPARAISON AVEC VOS AUTRES OPTIONS
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { name: 'Livret A', roi: 3, icon: Landmark, color: 'blue', desc: 'Capital bloqué' },
              { name: 'Assurance Vie', roi: 3.5, icon: ShieldAlert, color: 'purple', desc: 'Frais de gestion' },
              { name: 'SCPI/Immobilier', roi: 4.5, icon: Home, color: 'orange', desc: 'Illiquide' },
              { name: 'SOLAIRE', roi: calculationResult.roiPercentage, icon: Sun, color: 'emerald', desc: 'Sans bloquer de cash', highlight: true }
            ].map((item) => (
              <div 
                key={item.name}
                className={`bg-gradient-to-br ${item.highlight ? `from-${item.color}-900/40 to-black border-2 border-${item.color}-500 shadow-lg shadow-${item.color}-500/20` : `from-${item.color}-900/20 to-black border border-${item.color}-500/30`} rounded-2xl p-5 relative overflow-hidden transition-all hover:scale-105`}
              >
                {item.highlight && (
                  <div className="absolute top-2 right-2">
                    <span className="bg-yellow-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Meilleur Choix
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 bg-${item.color}-500/20 rounded-lg`}>
                    <item.icon className={`w-5 h-5 text-${item.color}-400`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-black text-white">{item.name}</h3>
                    <p className={`text-[10px] text-${item.color}-400`}>{item.desc}</p>
                  </div>
                </div>
                
                <div className={`text-4xl font-black text-${item.color}-400 mb-2`}>
                  {item.roi.toFixed(1)}%
                </div>
                <div className="text-[10px] text-zinc-500 uppercase font-bold">Rendement annuel moyen</div>
                
                {item.highlight && (
                  <div className="mt-3 pt-3 border-t border-emerald-500/20">
                    <p className="text-xs text-emerald-300 font-bold">
                      + Vous produisez votre propre énergie
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-6 bg-black/40 border border-white/10 rounded-xl p-4">
            <p className="text-sm text-zinc-300">
              <span className="text-white font-bold">💡 La différence ?</span> Les placements classiques <span className="text-red-400">immobilisent votre capital</span>. 
              Le solaire vous permet de <span className="text-emerald-400 font-bold">financer l'installation avec vos économies futures</span>, 
              tout en gardant votre épargne disponible pour d'autres opportunités.
            </p>
          </div>
        </div>

        {/* --- HERO SECTION AVEC POINT MORT EXPLIQUÉ --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-8 relative group flex">
             <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-teal-400 rounded-[32px] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
             
             <div className="relative w-full bg-zinc-900/80 backdrop-blur-sm rounded-[30px] border border-white/10 p-8 flex flex-col justify-between overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <Wallet className="w-64 h-64 text-blue-500" />
                </div>
                
                <div className="relative z-10">
                   <div className="flex flex-wrap items-center gap-3 mb-6">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
                          <Lock className="w-3 h-3" /> Projection {projectionYears} ans
                      </div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                          <TrendingUp className="w-3 h-3" /> ROI {calculationResult.roiPercentage.toFixed(1)}%/an
                      </div>
                   </div>
                   
                   <h1 className="text-zinc-400 font-medium text-lg mb-2">Capital Patrimonial Sécurisé</h1>
                   <div className="flex items-baseline gap-4 flex-wrap">
                     <span className={`text-5xl md:text-8xl font-black tracking-tighter drop-shadow-2xl ${calculationResult.totalSavingsProjected > 0 ? 'text-white' : 'text-red-500'}`}>
                       {formatEUR(calculationResult.totalSavingsProjected)}
                     </span>
                   </div>
                   
                   {/* EXPLICATION DU GAIN */}
                   <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                     <div className="flex items-start gap-2">
                       <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                       <div className="text-sm text-blue-300 space-y-2">
                         <p className="font-bold text-white">💡 Comment est calculé ce gain ?</p>
                         <p className="text-xs">
                           C'est la différence entre <span className="text-red-400 font-bold">ce que vous auriez payé au fournisseur</span> 
                           (sans panneaux) et <span className="text-blue-400 font-bold">ce que vous payez réellement</span> 
                           (crédit + reste de facture).
                         </p>
                         <div className="bg-black/40 rounded-lg p-3 space-y-1 text-xs font-mono">
                           <div className="text-zinc-500">FORMULE :</div>
                           <div className="text-red-400">Facture Sans Panneaux (inflation comprise)</div>
                           <div className="text-zinc-600">MOINS</div>
                           <div className="text-blue-400">(Mensualité Crédit + Reste Facture Réduite)</div>
                           <div className="text-zinc-600">ÉGALE</div>
                           <div className="text-emerald-400 font-bold">Votre Gain Net</div>
                         </div>
                         <p className="text-[11px] text-zinc-500 italic">
                           ⚠️ Les premières années, le gain peut être négatif (effort d'investissement). 
                           Après le crédit, il devient massif et permanent.
                         </p>
                       </div>
                     </div>
                   </div>
                </div>

                <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/5 pt-8">
                   <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                     <div className="text-emerald-500 text-[10px] uppercase font-bold tracking-wider mb-1">Rentabilité</div>
                     <div className="text-xl md:text-2xl font-black text-emerald-400">+{calculationResult.roiPercentage.toFixed(1)}%</div>
                     <div className="text-[10px] text-zinc-500">Vs Livret A (3%)</div>
                   </div>
                   <div className="bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
                     <div className="text-blue-400 text-[10px] uppercase font-bold tracking-wider mb-1">Gain Moyen</div>
                     <div className="text-xl md:text-2xl font-black text-white">+{formatEUR(calculationResult.averageYearlyGain)}/an</div>
                     <div className="text-[10px] text-zinc-500">Pouvoir d'achat</div>
                   </div>
                   <div>
                     {/* POINT MORT AVEC TOOLTIP */}
                     <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                       Point Mort 
                       <div className="group relative">
                         <HelpCircle className="w-3 h-3 cursor-help text-zinc-600 hover:text-white" />
                         <div className="absolute left-0 bottom-full mb-2 w-64 bg-zinc-900 border border-white/20 text-xs p-3 rounded-xl text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                           <div className="font-bold text-white mb-2 flex items-center gap-1">
                             <Target className="w-4 h-4 text-emerald-400" />
                             C'est quoi le Point Mort ?
                           </div>
                           <p className="leading-relaxed">
                             C'est l'année où vous <span className="text-emerald-400 font-bold">commencez à gagner de l'argent</span>. 
                           </p>
                           <div className="mt-2 pt-2 border-t border-white/10">
                             <div className="text-[10px] text-zinc-500 space-y-1">
                               <div>Avant {calculationResult.breakEvenPoint} ans = Investissement</div>
                               <div className="text-emerald-400">Après {calculationResult.breakEvenPoint} ans = Profit pur</div>
                             </div>
                           </div>
                         </div>
                       </div>
                     </div>
                     <div className="text-2xl font-bold text-white mb-1">{calculationResult.breakEvenPoint} ans</div>
                     <div className="text-[9px] text-zinc-600">Vous récupérez votre mise</div>
                   </div>
                   <div>
                     <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Investissement</div>
                     <div className="text-2xl font-bold text-zinc-400">{formatEUR(calculationResult.installCost)}</div>
                   </div>
                </div>
             </div>
          </div>

          <div className="lg:col-span-4 space-y-6 flex flex-col h-full">
             
             <div className="bg-gradient-to-br from-indigo-900/40 to-black border border-indigo-500/30 rounded-[30px] p-6 relative overflow-hidden flex-1">
                <div className="flex items-center gap-2 mb-4">
                   <Landmark className="w-5 h-5 text-indigo-400" />
                   <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Équivalent Bancaire</h3>
                </div>
                <p className="text-sm text-zinc-400 mb-4">
                   Pour générer <span className="text-white font-bold">{formatEUR(calculationResult.averageYearlyGain)}/an</span> avec un Livret A, 
                   il vous faudrait bloquer :
                </p>
                <div className="text-3xl font-black text-white mb-2 tracking-tight">
                   {formatEUR(calculationResult.bankEquivalentCapital)}
                </div>
                <div className="text-[10px] bg-indigo-500/20 text-indigo-300 inline-block px-2 py-1 rounded font-bold mb-3">
                   ICI, VOUS NE BLOQUEZ RIEN.
                </div>
                <p className="text-xs text-zinc-500 italic mt-3 border-t border-white/5 pt-3">
                  💰 Avec le solaire, votre argent reste libre pendant que vous générez des revenus.
                </p>
             </div>

             <div className={`relative rounded-[30px] p-1 flex-1 ${calculationResult.monthlyEffortYear1 > 0 ? 'bg-gradient-to-br from-orange-500/20 to-red-500/20' : 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20'}`}>
                <div className="bg-zinc-950 rounded-[28px] p-6 h-full flex flex-col justify-between relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between gap-2 mb-4">
                            <div className="flex items-center gap-2">
                                {calculationResult.monthlyEffortYear1 > 0 
                                    ? <Coins className="w-6 h-6 text-orange-400" />
                                    : <PiggyBank className="w-6 h-6 text-emerald-400" />
                                }
                                <span className={`text-sm font-bold uppercase tracking-wider ${calculationResult.monthlyEffortYear1 > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                                    {calculationResult.monthlyEffortYear1 > 0 ? "Effort d'Épargne" : "Gain Immédiat"}
                                </span>
                            </div>
                            <div className="group relative">
                                <HelpCircle className="w-4 h-4 text-zinc-600 hover:text-white cursor-help" />
                                <div className="absolute right-0 bottom-full mb-2 w-48 bg-zinc-800 text-xs p-2 rounded-lg text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                    Différence entre votre budget actuel et futur
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-baseline gap-2">
                             <span className={`text-4xl font-black ${calculationResult.monthlyEffortYear1 > 0 ? 'text-white' : 'text-emerald-400'}`}>
                                {calculationResult.monthlyEffortYear1 > 0 ? '+' : ''}{formatMoney(Math.abs(calculationResult.monthlyEffortYear1))}
                             </span>
                             <span className="text-sm text-zinc-500 font-bold">/mois</span>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                           <div className="text-[10px] font-mono text-zinc-500 mb-2 uppercase tracking-wide">Détail :</div>
                           <div className="flex justify-between text-xs text-zinc-400">
                               <span>Nouveau Budget :</span>
                               <span className="font-bold text-white">{formatMoney(calculationResult.newMonthlyBillYear1)}</span>
                           </div>
                           <div className="flex justify-between text-xs text-zinc-400">
                               <span>Ancien Budget :</span>
                               <span className="font-bold text-red-400">- {formatMoney(calculationResult.oldMonthlyBillYear1)}</span>
                           </div>
                           <div className={`flex justify-between text-xs font-bold pt-1 border-t border-white/10 ${calculationResult.monthlyEffortYear1 > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                               <span>= {calculationResult.monthlyEffortYear1 > 0 ? "Effort" : "Gain"}</span>
                               <span>{calculationResult.monthlyEffortYear1 > 0 ? '+' : ''}{formatMoney(Math.abs(calculationResult.monthlyEffortYear1))}</span>
                           </div>
                        </div>
                        
                        {calculationResult.monthlyEffortYear1 > 0 && (
                          <p className="text-[10px] text-orange-300/70 italic mt-3 border-t border-white/5 pt-3">
                            ⚡ Cet effort est TEMPORAIRE (durée du crédit). Après, vous économisez {formatMoney(calculationResult.oldMonthlyBillYear1)}/mois à vie.
                          </p>
                        )}
                    </div>
                </div>
             </div>

          </div>
        </div>

        {/* --- GRAPH 3 : BILAN TOTAL --- */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-[32px] p-8 backdrop-blur-sm">
           <h2 className="text-xl font-black text-white mb-4 flex items-center gap-3">
              <Scale className="text-white" /> BILAN TOTAL SUR {projectionYears} ANS
           </h2>
           <p className="text-zinc-500 text-sm mb-8">💡 Imaginez ces barres comme deux comptes bancaires : l'un qui se vide (rouge), l'autre qui se remplit (bleu).</p>
           
           <div className="flex flex-col gap-8">
               <div className="group">
                  <div className="flex justify-between items-end mb-3">
                     <span className="text-zinc-400 font-bold uppercase text-xs tracking-wider flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div> Sans Solaire (Argent Perdu)
                     </span>
                     <span className="text-3xl font-black text-white tabular-nums">{formatEUR(calculationResult.totalSpendNoSolar)}</span>
                  </div>
                  <div className="h-10 w-full bg-zinc-950 rounded-full p-1 border border-white/5 relative overflow-hidden">
                      <div 
                         className="h-full bg-gradient-to-r from-red-600 to-red-500 rounded-full relative transition-all duration-1000 ease-out flex items-center justify-end px-3"
                         style={{ width: `${percentNoSolar}%` }}
                      >
                         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                      </div>
                  </div>
                  <p className="text-xs text-red-500/60 mt-2 font-mono ml-1">💸 Cet argent est parti pour toujours.</p>
               </div>

               <div className="group">
                  <div className="flex justify-between items-end mb-3">
                     <span className="text-zinc-400 font-bold uppercase text-xs tracking-wider flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div> Avec Solaire (Investissement Patrimonial)
                     </span>
                     <span className="text-3xl font-black text-blue-400 tabular-nums">{formatEUR(calculationResult.totalSpendSolar)}</span>
                  </div>
                  <div className="h-10 w-full bg-zinc-950 rounded-full p-1 border border-white/5 relative overflow-hidden">
                      <div 
                         className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full relative transition-all duration-1000 ease-out flex items-center justify-end px-3"
                         style={{ width: `${percentSolar}%` }}
                      >
                         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                      </div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-blue-500/60 font-mono ml-1">⚡ Cette dépense génère un actif qui produit pendant 25+ ans.</p>
                      <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg text-sm font-bold border border-emerald-500/20">
                          💰 Différence : {formatEUR(calculationResult.totalSpendNoSolar - calculationResult.totalSpendSolar)}
                      </div>
                  </div>
               </div>
           </div>
        </div>

        {/* --- COMPARATIF LOCATAIRE VS PROPRIETAIRE --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
           <div className="bg-red-950/10 border border-red-900/30 rounded-[24px] p-6 relative overflow-hidden flex flex-col h-full group hover:bg-red-950/20 transition-colors">
              <div className="flex items-start gap-5 mb-4">
                  <div className="p-3 bg-red-500/10 rounded-xl shrink-0 border border-red-500/20 group-hover:scale-105 transition-transform mt-1">
                     <Ban className="w-8 h-8 text-red-500" />
                  </div>
                  <div className="flex-1">
                     <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold text-white">LOCATAIRE ÉNERGÉTIQUE</h3>
                        <span className="text-[10px] font-bold uppercase bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Modèle Dépassé</span>
                     </div>
                     <p className="text-red-400/90 text-sm font-medium leading-relaxed">
                        Vous louez l'électricité que vous consommez. Chaque euro payé disparaît.
                     </p>
                  </div>
              </div>
              
              <ul className="space-y-3 mb-6 flex-1">
                 <li className="flex items-center gap-2 text-xs text-zinc-300">
                     <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" /> 
                     <span>Vous subissez 100% des hausses (inflation sans fin)</span>
                 </li>
                 <li className="flex items-center gap-2 text-xs text-zinc-300">
                     <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" /> 
                     <span>0€ de capital créé après 20 ans (facture éternelle)</span>
                 </li>
                 <li className="flex items-center gap-2 text-xs text-zinc-300">
                     <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" /> 
                     <span>Dépendance totale aux décisions politiques</span>
                 </li>
                 <li className="flex items-center gap-2 text-xs text-zinc-300">
                     <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" /> 
                     <span>Votre facture finance les profits des actionnaires</span>
                 </li>
              </ul>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-auto">
                 <div className="h-full bg-red-600 w-full animate-pulse"></div>
              </div>
              <p className="text-[10px] text-red-500/60 italic mt-3 text-center">
                📉 Pendant que vous payez, votre pouvoir d'achat s'érode.
              </p>
           </div>

           <div className="bg-gradient-to-r from-blue-900/30 to-black border border-blue-500/40 rounded-[24px] p-6 relative overflow-hidden flex flex-col h-full shadow-lg shadow-blue-500/10 group hover:border-blue-500/60 transition-all">
              <div className="flex items-start gap-5 mb-4">
                  <div className="p-3 bg-blue-500 rounded-xl shrink-0 shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform mt-1">
                     <Crown className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                     <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold text-white">PROPRIÉTAIRE PRODUCTEUR</h3>
                        <span className="text-[10px] font-bold uppercase bg-blue-500 text-white px-2 py-0.5 rounded shadow-lg shadow-blue-500/50">Votre Liberté</span>
                     </div>
                     <p className="text-blue-300 text-sm font-medium leading-relaxed">
                        Vous possédez votre centrale. Chaque kWh produit vous appartient.
                     </p>
                  </div>
              </div>

              <ul className="space-y-3 mb-6 flex-1">
                 <li className="flex items-center gap-2 text-xs text-zinc-300">
                     <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> 
                     <span>Prix du kWh bloqué et garanti pendant 30 ans</span>
                 </li>
                 <li className="flex items-center gap-2 text-xs text-zinc-300">
                     <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> 
                     <span>Vous créez un patrimoine transmissible et valorisable</span>
                 </li>
                 <li className="flex items-center gap-2 text-xs text-zinc-300">
                     <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> 
                     <span>Indépendance face aux crises énergétiques</span>
                 </li>
                 <li className="flex items-center gap-2 text-xs text-zinc-300">
                     <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> 
                     <span>Vous êtes la banque : vous financez avec vos économies futures</span>
                 </li>
              </ul>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-auto">
                 <div className="h-full bg-blue-500 w-[70%]"></div>
              </div>
              <p className="text-[10px] text-emerald-400 font-bold italic mt-3 text-center">
                🚀 Pendant que vous économisez, votre patrimoine grandit.
              </p>
           </div>
        </div>

        {/* ==================== GARANTIES PERFORMANCE (TVA 20%) VS ESSENTIELLE (TVA 5.5%) ==================== */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-[24px] overflow-hidden">
          {/* PARTIE 3 - FIN DU FICHIER */}
            
            {/* HEADER GARANTIES AVEC CHECKBOX */}
            <div className="p-6 border-b border-white/5 bg-gradient-to-r from-amber-900/20 to-black">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="text-amber-500 w-6 h-6" /> GARANTIES & SÉCURITÉ
                </h3>
                
                {/* CHECKBOX PERFORMANCE VS ESSENTIELLE */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <span className={`text-sm font-bold transition-colors ${!premiumWarranty ? 'text-white' : 'text-zinc-600'}`}>
                      Essentielle (TVA 5.5%)
                    </span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={premiumWarranty}
                        onChange={(e) => setPremiumWarranty(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-16 h-8 bg-zinc-700 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
                      <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-transform peer-checked:translate-x-8 shadow-lg"></div>
                    </div>
                    <span className={`text-sm font-bold transition-colors ${premiumWarranty ? 'text-white' : 'text-zinc-600'}`}>
                      Performance (TVA 20%)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* CONTENU CONDITIONNEL */}
            <div className="p-6">
              {premiumWarranty ? (
                <>
                  {/* GARANTIES PERFORMANCE (TVA 20%) */}
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 mb-6">
                    <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
                      ⚡ OFFRE PERFORMANCE - TVA 20%
                    </div>
                    <p className="text-sm text-zinc-300">
                      Garantie maximale avec autopilote IA, afficheur temps réel et production garantie 30 ans.
                    </p>
                  </div>

                  {/* 4 CARTES GARANTIES PERFORMANCE */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                      { 
                        title: "Panneaux", 
                        val: "30 ANS", 
                        detail: "Performance garantie",
                        desc: "Production garantie -0.4%/an max. Si moins, on paie la différence.",
                        icon: Sun 
                      },
                      { 
                        title: "Onduleurs", 
                        val: "25 ANS", 
                        detail: "Pièces + M.O. + Déplacement",
                        desc: "Remplacement gratuit si panne, main d'œuvre et déplacement inclus.",
                        icon: Zap 
                      },
                      { 
                        title: "Structure", 
                        val: "10 ANS", 
                        detail: "Matériel + M.O. + Déplacement",
                        desc: "Fixations, rails, étanchéité couverts avec intervention gratuite.",
                        icon: Wrench 
                      },
                      { 
                        title: "Panneaux", 
                        val: "25 ANS", 
                        detail: "Matériel uniquement",
                        desc: "Défaut de fabrication couvert (hors casse accidentelle).",
                        icon: Sun 
                      },
                    ].map((item, i) => (
                      <div key={i} className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 p-4 rounded-xl group hover:bg-blue-500/15 transition-all relative">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-3 text-blue-400 group-hover:scale-110 transition-transform">
                          <item.icon className="w-6 h-6" />
                        </div>
                        <div className="text-2xl font-black text-blue-400 mb-1 leading-none">{item.val}</div>
                        <div className="text-white font-bold text-[10px] uppercase tracking-wide mb-1">{item.title}</div>
                        <div className="text-[9px] text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 inline-block">
                          {item.detail}
                        </div>
                        
                        {/* TOOLTIP */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-zinc-900 border border-blue-500/30 text-xs p-3 rounded-lg text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                          <div className="text-blue-400 font-bold mb-1">{item.title} - {item.val}</div>
                          {item.desc}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* AUTOPILOTE EDF */}
                  <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-2xl p-6 mb-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-500/20 rounded-xl shrink-0">
                        <Zap className="w-8 h-8 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-black text-white mb-2 flex items-center gap-2">
                          🤖 AUTOPILOTE INTELLIGENT EDF <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded font-bold">EXCLUSIF</span>
                        </h4>
                        <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
                          Votre installation est pilotée 24/7 par intelligence artificielle. Nous détectons les pannes à distance AVANT que vous ne les remarquiez.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-black/40 rounded-xl p-3 border border-blue-500/20">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                              <span className="text-xs font-bold text-blue-400 uppercase">Surveillance en Temps Réel</span>
                            </div>
                            <p className="text-xs text-zinc-400">
                              Chaque panneau est surveillé individuellement. Détection instantanée des anomalies (ombre, salissure, défaillance).
                            </p>
                          </div>
                          
                          <div className="bg-black/40 rounded-xl p-3 border border-blue-500/20">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                              <span className="text-xs font-bold text-blue-400 uppercase">Optimisation Automatique</span>
                            </div>
                            <p className="text-xs text-zinc-400">
                              L'IA ajuste en permanence les paramètres pour maximiser votre production et vos économies.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AFFICHEUR TEMPS RÉEL */}
                  <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-purple-500/20 rounded-xl shrink-0">
                        <Eye className="w-8 h-8 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-black text-white mb-2">
                          📱 AFFICHEUR CONNECTÉ EN TEMPS RÉEL
                        </h4>
                        <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
                          Suivez votre production, votre consommation et vos économies depuis votre smartphone ou tablette.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="bg-black/40 rounded-xl p-3 border border-purple-500/20 text-center">
                            <div className="text-2xl font-black text-purple-400 mb-1">⚡</div>
                            <div className="text-xs font-bold text-white mb-1">Production Live</div>
                            <div className="text-[10px] text-zinc-500">kW actuels + Cumul jour</div>
                          </div>
                          
                          <div className="bg-black/40 rounded-xl p-3 border border-purple-500/20 text-center">
                            <div className="text-2xl font-black text-purple-400 mb-1">🏠</div>
                            <div className="text-xs font-bold text-white mb-1">Consommation Live</div>
                            <div className="text-[10px] text-zinc-500">Appareil par appareil</div>
                          </div>
                          
                          <div className="bg-black/40 rounded-xl p-3 border border-purple-500/20 text-center">
                            <div className="text-2xl font-black text-emerald-400 mb-1">💰</div>
                            <div className="text-xs font-bold text-white mb-1">Économies Temps Réel</div>
                            <div className="text-[10px] text-zinc-500">€ économisés aujourd'hui</div>
                          </div>
                        </div>

                        <div className="mt-4 bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
                          <p className="text-xs text-purple-300 font-bold flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            Optimisez vos consommations : l'afficheur vous suggère les meilleurs moments pour lancer lave-linge, lave-vaisselle, etc.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RÉSUMÉ PERFORMANCE */}
                  <div className="mt-6 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-center">
                    <p className="text-sm text-blue-300 font-bold">
                      🛡️ RÉSULTAT : Vous dormez tranquille. Nous surveillons tout 24/7. Si problème, on intervient gratuitement. Si sous-production, on paie la différence.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* GARANTIES ESSENTIELLE (TVA 5.5%) */}
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mb-6">
                    <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      OFFRE ESSENTIELLE - TVA RÉDUITE 5.5%
                    </div>
                    <p className="text-sm text-zinc-300 mb-2">
                      Panneaux fabriqués en France avec garanties standards de l'industrie.
                    </p>
                    <div className="text-xs text-emerald-400 font-bold">
                      💰 Économisez {((installCost * 0.20) - (installCost * 0.055)).toFixed(0)}€ de TVA !
                    </div>
                  </div>

                  {/* 4 CARTES GARANTIES ESSENTIELLE */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                      { 
                        title: "Panneaux", 
                        val: "25 ANS", 
                        detail: "Performance",
                        desc: "Production garantie -0.4%/an. Fabrication française.",
                        icon: Sun,
                        highlight: true
                      },
                      { 
                        title: "Onduleurs", 
                        val: "25 ANS", 
                        detail: "Pièces + M.O. + Déplacement",
                        desc: "Couverture complète identique à Performance.",
                        icon: Zap 
                      },
                      { 
                        title: "Structure", 
                        val: "10 ANS", 
                        detail: "Matériel + M.O. + Déplacement",
                        desc: "Identique à Performance.",
                        icon: Wrench 
                      },
                      { 
                        title: "Panneaux", 
                        val: "25 ANS", 
                        detail: "Matériel",
                        desc: "Défauts de fabrication couverts.",
                        icon: Sun 
                      },
                    ].map((item, i) => (
                      <div key={i} className={`bg-gradient-to-br ${item.highlight ? 'from-emerald-500/15 to-green-500/10 border-emerald-500/30' : 'from-emerald-500/10 to-green-500/5 border-emerald-500/20'} border p-4 rounded-xl group hover:bg-emerald-500/15 transition-all relative`}>
                        <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mb-3 text-emerald-400 group-hover:scale-110 transition-transform">
                          <item.icon className="w-6 h-6" />
                        </div>
                        {item.highlight && (
                          <div className="absolute top-2 right-2 text-[9px] bg-emerald-500 text-white px-2 py-0.5 rounded font-bold">
                            🇫🇷 FRANÇAIS
                          </div>
                        )}
                        <div className="text-2xl font-black text-emerald-400 mb-1 leading-none">{item.val}</div>
                        <div className="text-white font-bold text-[10px] uppercase tracking-wide mb-1">{item.title}</div>
                        <div className="text-[9px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                          {item.detail}
                        </div>
                        
                        {/* TOOLTIP */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-zinc-900 border border-emerald-500/30 text-xs p-3 rounded-lg text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                          <div className="text-emerald-400 font-bold mb-1">{item.title} - {item.val}</div>
                          {item.desc}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* DIFFÉRENCES CLÉS */}
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5">
                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-400" />
                      Différences avec l'offre Performance
                    </h4>
                    <ul className="space-y-2 text-xs text-zinc-400">
                      <li className="flex items-start gap-2">
                        <span className="text-zinc-600">❌</span>
                        <span>Pas d'autopilote IA (surveillance à distance)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-zinc-600">❌</span>
                        <span>Pas d'afficheur connecté temps réel</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-zinc-600">❌</span>
                        <span>Garantie performance 25 ans au lieu de 30 ans</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600">✅</span>
                        <span className="text-emerald-400 font-bold">TVA réduite à 5.5% (économie immédiate de {((installCost * 0.145)).toFixed(0)}€)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600">✅</span>
                        <span className="text-emerald-400 font-bold">Panneaux fabriqués en France</span>
                      </li>
                    </ul>
                    
                    <button 
                      onClick={() => setPremiumWarranty(true)}
                      className="mt-4 w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold px-6 py-3 rounded-xl hover:scale-105 transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                    >
                      <ArrowRight className="w-5 h-5" />
                      PASSER À L'OFFRE PERFORMANCE
                    </button>
                  </div>
                </>
              )}
            </div>
        </div>

        {/* --- GRAPHIQUES AVEC BARRES ROUGES VISIBLES (CORRIGÉ) --- */}
        <div className="bg-zinc-900/50 border border-white/10 rounded-[30px] p-8 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-zinc-400" />
                    <h3 className="text-lg font-bold uppercase tracking-wider text-white">Structure du Budget (Mensuel)</h3>
                </div>
                <div className="text-xs bg-zinc-800 px-3 py-1 rounded-full text-zinc-400 border border-white/5">
                    Année 1 - Comparatif
                </div>
            </div>
            
            <div className="space-y-6">
                <div className="relative">
                   <div className="flex justify-between items-end text-sm font-bold mb-2 z-10 relative">
                      <span className="text-zinc-400 uppercase tracking-wider text-xs">Situation Actuelle</span>
                      <span className="text-red-500 text-lg">{formatMoney(calculationResult.oldMonthlyBillYear1)} /mois</span>
                   </div>
                   <div className="h-16 w-full bg-zinc-950 rounded-xl overflow-hidden relative border border-white/5 flex items-center">
                      <div className="h-full bg-red-600 w-full flex items-center px-4 relative">
                         <span className="text-white/20 absolute right-4 text-4xl font-black uppercase tracking-tighter opacity-50">100% Perte</span>
                         <span className="text-xs font-black text-white uppercase tracking-widest relative z-10">Facture Actuelle</span>
                      </div>
                   </div>
                </div>

                <div className="relative">
                   <div className="flex justify-between items-end text-sm font-bold mb-2 z-10 relative">
                      <span className="text-zinc-400 uppercase tracking-wider text-xs">Projet Solaire</span>
                      <span className="text-white text-lg">{formatMoney(calculationResult.newMonthlyBillYear1)} /mois</span>
                   </div>
                   <div className="h-16 w-full bg-zinc-950 rounded-xl overflow-hidden relative border border-white/5 flex">
                      <div 
                        style={{width: `${(calculationResult.year1.creditPayment / 12 / calculationResult.newMonthlyBillYear1) * 100}%`}} 
                        className="h-full bg-blue-600 flex flex-col justify-center px-4 border-r border-blue-400/30 relative"
                      >
                         <span className="text-[10px] font-black text-blue-200 uppercase tracking-wide">Crédit</span>
                         <span className="text-xs font-bold text-white">{formatMoney(calculationResult.year1.creditPayment / 12)}</span>
                      </div>
                      <div 
                        style={{width: `${(calculationResult.year1.edfResidue / 12 / calculationResult.newMonthlyBillYear1) * 100}%`}} 
                        className="h-full bg-amber-500 flex flex-col justify-center px-4 relative"
                      >
                         <span className="text-[10px] font-black text-amber-900 uppercase tracking-wide">Reste</span>
                         <span className="text-xs font-bold text-white">{formatMoney(calculationResult.year1.edfResidue / 12)}</span>
                      </div>
                   </div>
                </div>
            </div>
         </div>

        <div className="bg-zinc-900/50 border border-white/5 rounded-[32px] p-8 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-3">
                        <TrendingUp className="text-emerald-500" /> ÉCONOMIES ANNUELLES
                    </h2>
                    <p className="text-zinc-500 text-sm mt-1 mb-3">Votre cashflow année par année</p>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gradient-to-b from-red-500 to-red-600 rounded shadow-lg"></div>
                        <span className="text-zinc-400"><span className="text-red-400 font-bold">Barres rouges</span> = Effort d'investissement (vous payez le crédit)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded shadow-lg"></div>
                        <span className="text-zinc-400"><span className="text-emerald-400 font-bold">Barres vertes</span> = Rentabilité pure (vous économisez après le crédit)</span>
                      </div>
                    </div>
                </div>
            </div>

            <div className="w-full" style={{ minHeight: '400px' }}>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={calculationResult.slicedDetails} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="barGradientPositive" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.9}/>
                                <stop offset="100%" stopColor="#059669" stopOpacity={0.7}/>
                            </linearGradient>
                            <linearGradient id="barGradientNegative" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9}/>
                                <stop offset="100%" stopColor="#dc2626" stopOpacity={0.7}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} opacity={0.5} />
                        <XAxis 
                            dataKey="year" 
                            stroke="#52525b" 
                            tick={{fill: '#a1a1aa', fontSize: 12}} 
                            tickLine={false} 
                            axisLine={false}
                        />
                        <YAxis 
                            stroke="#52525b" 
                            tickFormatter={(value) => `${(value / 1000).toFixed(1)} k€`}
                            tick={{fill: '#a1a1aa', fontSize: 12}} 
                            tickLine={false} 
                            axisLine={false}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: '#09090b', 
                                borderColor: '#27272a', 
                                borderRadius: '12px', 
                                padding: '12px', 
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' 
                            }}
                            itemStyle={{ fontWeight: 600, fontSize: '13px' }}
                            formatter={(value: number) => [
                                formatEUR(value), 
                                value >= 0 ? '💰 Gain Annuel' : '📊 Effort Annuel'
                            ]}
                            labelStyle={{ color: '#a1a1aa', marginBottom: '8px', fontSize: '12px' }}
                        />
                        <Bar 
                            dataKey="cashflowDiff" 
                            name="Cashflow Annuel"
                            radius={[8, 8, 0, 0]}
                        >
                            {calculationResult.slicedDetails.map((entry, index) => (
                                <rect
                                  key={`bar-${index}`}
                                  fill={entry.cashflowDiff >= 0 ? 'url(#barGradientPositive)' : 'url(#barGradientNegative)'}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            
            <div className="mt-6 bg-zinc-800/50 border border-white/10 rounded-xl p-4">
              <p className="text-sm text-zinc-300">
                💡 <span className="font-bold text-white">Lecture du graphique :</span> Les premières années, vous payez le crédit (barres rouges = effort temporaire). 
                Après la fin du crédit, vous économisez plein pot (barres vertes = profit permanent). 
                <span className="text-emerald-400 font-bold"> Plus vous attendez, plus les barres vertes deviennent grandes !</span>
              </p>
            </div>
        </div>

        <div className="bg-zinc-900/50 border border-white/5 rounded-[32px] p-8 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-3">
                        <TrendingDown className="text-red-500" /> LE GOUFFRE FINANCIER
                    </h2>
                    <p className="text-zinc-500 text-sm mt-1 max-w-xl">
                        Rouge : Argent donné au fournisseur. Bleu : Investissement patrimonial.
                    </p>
                </div>
                
                <div className="bg-black/40 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
                    <Flame className={`w-4 h-4 ${inflationRate > 5 ? 'text-red-500 animate-pulse' : 'text-orange-400'}`} />
                    <div className="flex flex-col">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Inflation</label>
                        <input 
                            type="range" 
                            min="3" 
                            max="10" 
                            step="0.5" 
                            value={inflationRate} 
                            onChange={(e) => setInflationRate(parseFloat(e.target.value))}
                            className="w-24 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                    <span className="text-lg font-black text-white tabular-nums w-12 text-right">{inflationRate}%</span>
                </div>
            </div>

            <div className="w-full" style={{ minHeight: '400px' }}>
                <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={calculationResult.slicedDetails} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
                            </linearGradient>
                            <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} opacity={0.5} />
                        <XAxis 
                            dataKey="year" 
                            stroke="#52525b" 
                            tick={{fill: '#a1a1aa', fontSize: 12}} 
                            tickLine={false} 
                            axisLine={false}
                        />
                        <YAxis 
                            stroke="#52525b" 
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)} k€`}
                            tick={{fill: '#a1a1aa', fontSize: 12}} 
                            tickLine={false} 
                            axisLine={false}
                            domain={[0, 'auto']}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: '#09090b', 
                                borderColor: '#27272a', 
                                borderRadius: '12px', 
                                padding: '12px', 
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' 
                            }}
                            itemStyle={{ fontWeight: 600, fontSize: '13px' }}
                            formatter={(value: number) => formatEUR(value)}
                            labelStyle={{ color: '#a1a1aa', marginBottom: '8px', fontSize: '12px' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{fontSize: '13px', paddingTop: '20px'}}/>
                        
                        <Area 
                            type="monotone" 
                            dataKey="cumulativeSpendNoSolar" 
                            name="Argent Brûlé (Fournisseur)" 
                            stroke="#ef4444" 
                            strokeWidth={4}
                            fill="url(#colorRed)"
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#ef4444' }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="cumulativeSpendSolar" 
                            name="Argent Investi (Solaire)" 
                            stroke="#3b82f6" 
                            strokeWidth={4}
                            fill="url(#colorBlue)"
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* --- TABLEAU DETAILLÉ --- */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-[32px] overflow-hidden">
            <div className="p-8 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Table2 className="text-zinc-500" /> Plan de Financement Détaillé
                </h3>
                
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                   <button 
                     onClick={() => setTableView('yearly')}
                     className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${tableView === 'yearly' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                   >
                     <Calendar className="w-3 h-3" /> Annuel
                   </button>
                   <button 
                     onClick={() => setTableView('monthly')}
                     className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${tableView === 'monthly' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                   >
                     <CalendarDays className="w-3 h-3" /> Mensuel
                   </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-black/40 text-[10px] uppercase tracking-wider text-zinc-500 border-b border-white/5">
                            <th className="p-4 font-bold text-center">Année</th>
                            <th className="p-4 font-bold text-red-400">Sans Solaire</th>
                            <th className="p-4 font-bold text-blue-400 bg-blue-500/5 border-l border-white/5">Crédit</th>
                            <th className="p-4 font-bold text-amber-400 bg-blue-500/5">Reste Facture</th>
                            <th className="p-4 font-bold text-white bg-blue-500/10 border-r border-white/5">Total Avec Solaire</th>
                            <th className="p-4 font-bold text-center border-r border-white/5">
                               {tableView === 'yearly' ? "EFFORT ANNUEL" : "EFFORT MENSUEL"}
                            </th>
                            <th className="p-4 font-bold text-emerald-400 text-right">Trésorerie Cumulée</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs">
                        {calculationResult.slicedDetails.map((row, index) => {
                            const div = tableView === 'monthly' ? 12 : 1;
                            
                            const displayEdfOld = row.edfBillWithoutSolar / div;
                            const displayCredit = row.creditPayment / div;
                            const displayResidue = row.edfResidue / div;
                            const displayTotalNew = row.totalWithSolar / div;
                            const displayEffort = (row.totalWithSolar - row.edfBillWithoutSolar) / div;

                            return (
                                <tr key={row.year} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${index % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
                                    <td className="p-4 font-mono text-zinc-400 text-center">{row.year}</td>
                                    
                                    <td className="p-4 font-mono text-red-400/80">{formatMoney(displayEdfOld)}</td>
                                    
                                    <td className="p-4 font-mono text-blue-300 bg-blue-500/5 border-l border-white/5">
                                        {row.creditPayment > 0 ? formatMoney(displayCredit) : <span className="text-zinc-600">-</span>}
                                    </td>
                                    <td className="p-4 font-mono text-amber-300 bg-blue-500/5">
                                        {formatMoney(displayResidue)}
                                    </td>
                                    <td className="p-4 font-bold font-mono text-white bg-blue-500/10 border-r border-white/5">
                                        {formatMoney(displayTotalNew)}
                                    </td>
                                    
                                    <td className="p-4 font-mono font-bold text-center border-r border-white/5 text-sm">
                                        <span className={displayEffort > 0 ? 'text-white' : 'text-emerald-400'}>
                                            {displayEffort > 0 ? '+' : ''}{formatMoney(Math.abs(displayEffort))}
                                        </span>
                                    </td>

                                    <td className={`p-4 font-mono font-bold text-right ${row.cumulativeSavings > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {formatEUR(row.cumulativeSavings)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>

        {/* --- CTA FINAL ULTRA PERSUASIF --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 mb-12">
           <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-[32px] p-8">
               <div className="flex items-center gap-3 mb-6">
                   <div className="p-2 bg-purple-500/20 rounded-lg">
                       <Eye className="w-5 h-5 text-purple-400" />
                   </div>
                   <h3 className="text-lg font-bold text-white">L'IA A Analysé Votre Situation</h3>
               </div>
               <div className="prose prose-invert prose-p:text-zinc-400 prose-strong:text-white leading-relaxed">
                   <p>{data.salesPitch}</p>
               </div>
           </div>

           <div className="bg-gradient-to-br from-blue-900/20 to-black border-2 border-blue-500/40 rounded-[32px] p-8 flex flex-col justify-center items-center text-center relative overflow-hidden group">
               <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors"></div>
               <div className="relative z-10">
                   <h3 className="text-3xl font-black text-white mb-4">LA SEULE VRAIE QUESTION</h3>
                   <p className="text-zinc-400 mb-8 max-w-sm mx-auto leading-relaxed">
                     Vous avez les chiffres. Vous avez les garanties. Vous avez la preuve mathématique. 
                     <span className="text-white font-bold"> Préférez-vous enrichir votre fournisseur ou vous enrichir vous-même ?</span>
                   </p>
                   
                   <div className="space-y-3">
                     <button className="w-full bg-white text-black font-black text-lg px-8 py-5 rounded-xl hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all flex items-center justify-center gap-3 group/btn">
                         <CheckCircle2 className="w-6 h-6 group-hover/btn:rotate-12 transition-transform" />
                         JE SÉCURISE MON TARIF MAINTENANT
                         <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                     </button>
                     
                     <p className="text-[10px] text-zinc-600 italic">
                       ⏰ Chaque jour d'attente = {formatMoney(calculationResult.lossIfWait1Year / 365)} perdus
                     </p>
                   </div>
               </div>
           </div>
        </div>

      </main>
    </div>
  );
};
