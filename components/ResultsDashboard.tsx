import React, { useState, useEffect, useMemo } from 'react';
import { SimulationResult, YearlyDetail } from '../types';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Wallet, Zap, TrendingUp, TrendingDown, Sun, ShieldAlert, Flame, Lock, Timer, PiggyBank, Landmark, Table2, Info, Calendar, Scale, Crown, Ban, Wrench, Truck, CheckCircle2, Eye, CalendarDays, Coins, ArrowRight, HelpCircle, AlertTriangle, Edit3, Settings } from 'lucide-react';

interface ResultsDashboardProps {
  data: SimulationResult;
  onReset: () => void;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ data, onReset }) => {
  // ==================== ÉTATS ÉDITABLES ====================
  // Tous les paramètres financiers sont maintenant modifiables en temps réel
  const [inflationRate, setInflationRate] = useState<number>(Number(data.params.inflationRate) || 5);
  const [projectionYears, setProjectionYears] = useState(20);
  
  // Nouveaux états pour paramètres éditables
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

  // ==================== MOTEUR DE CALCUL FINANCIER ====================
  // Tous les calculs sont recalculés en temps réel quand un paramètre change
  const calculationResult = useMemo(() => {
    // ===== SÉCURISATION DES TYPES =====
    const currentAnnualBill = Number(data.params.currentAnnualBill) || 0;
    const yearlyConsumption = Number(data.params.yearlyConsumption) || 0;
    
    // Utilisation des états locaux (modifiables)
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
    
    // ===== ÉTAPE 1 : CONSOMMATION DE BASE =====
    // FORMULE : Si kWh fournis → utiliser ça, sinon estimer via FACTURE / PRIX
    // LOGIQUE : baseConsumptionKwh = kWh réels ou (Facture Annuelle / Prix du kWh)
    const baseConsumptionKwh = yearlyConsumption > 0 
      ? yearlyConsumption 
      : (localElectricityPrice > 0 ? currentAnnualBill / localElectricityPrice : 0);
    
    // ===== ÉTAPE 2 : AUTOCONSOMMATION =====
    // FORMULE : kWh Autoconsommés = Production Annuelle × Taux d'Autoconsommation
    // EXEMPLE : 5000 kWh × 70% = 3500 kWh autoconsommés
    const selfConsumedKwh = localYearlyProduction * (localSelfConsumptionRate / 100);
    
    // ===== ÉTAPE 3 : TAUX D'AUTONOMIE =====
    // FORMULE : Autonomie % = (kWh Autoconsommés / Consommation Totale) × 100
    // EXEMPLE : (3500 / 5000) × 100 = 70% d'autonomie
    // NOTE : Plafonné à 100% car on ne peut pas consommer plus qu'on ne produit
    const savingsRatePercent = baseConsumptionKwh > 0 
      ? Math.min(100, (selfConsumedKwh / baseConsumptionKwh) * 100) 
      : 0;

    // Compteurs cumulatifs
    let cumulativeSavings = 0;
    let cumulativeWithout = 0;
    let cumulativeWith = 0;

    // ===== PROJECTION SUR 30 ANS =====
    for (let i = 0; i < 30; i++) {
      const year = startYear + i;
      
      // ===== A. SCÉNARIO SANS SOLAIRE (Fournisseur Classique) =====
      // FORMULE : Prix Année N = Prix Base × (1 + Inflation)^N
      // EXEMPLE : 0.25€ × (1.05)^5 = 0.319€/kWh après 5 ans à 5% d'inflation
      const currentElectricityPrice = localElectricityPrice * Math.pow(1 + localInflation / 100, i);
      
      // FORMULE : Facture Sans Solaire = Consommation × Prix Année N
      // EXEMPLE : 5000 kWh × 0.319€ = 1595€/an
      const billWithoutSolar = baseConsumptionKwh * currentElectricityPrice;
      
      // ===== B. SCÉNARIO AVEC SOLAIRE =====
      // FORMULE 1 : Économie € = kWh Autoconsommés × Prix Année N
      // EXEMPLE : 3500 kWh × 0.319€ = 1116.50€ économisés
      // LOGIQUE : Chaque kWh autoproduit évite d'acheter 1 kWh au fournisseur
      const savingsInEuros = selfConsumedKwh * currentElectricityPrice;
      
      // FORMULE 2 : Facture Résiduelle = Facture Pleine - Économies
      // EXEMPLE : 1595€ - 1116.50€ = 478.50€ (ce qu'il reste à payer)
      const residuaryBill = Math.max(0, billWithoutSolar - savingsInEuros);

      // FORMULE 3 : Coût Crédit Annuel
      // LOGIQUE : Si crédit actif → 12 × (Mensualité + Assurance), sinon 0
      const isCreditActive = (i * 12) < localCreditDurationMonths;
      const creditCostYearly = isCreditActive 
        ? (localCreditMonthlyPayment + localInsuranceMonthlyPayment) * 12 
        : 0;

      // FORMULE 4 : Total Décaissé = Facture Résiduelle + Crédit
      // EXEMPLE : 478.50€ + (150€×12) = 2278.50€/an
      const totalDecaissé = residuaryBill + creditCostYearly;

      // ===== C. GAIN ANNUEL RÉEL =====
      // FORMULE : Gain = Ce qu'on AURAIT payé - Ce qu'on PAIE réellement
      // EXEMPLE : 1595€ - 2278.50€ = -683.50€ (Effort la 1ère année si crédit lourd)
      // NOTE : Négatif = Effort, Positif = Gain
      const yearlySaving = billWithoutSolar - totalDecaissé; 
      
      // Mise à jour des cumulés
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

    // Extraction des données pour la période sélectionnée
    const slicedDetails = details.slice(0, projectionYears);
    const totalSavingsProjected = slicedDetails[slicedDetails.length - 1].cumulativeSavings;
    const totalSpendNoSolar = slicedDetails[slicedDetails.length - 1].cumulativeSpendNoSolar;
    const totalSpendSolar = slicedDetails[slicedDetails.length - 1].cumulativeSpendSolar;
    
    // ===== POINT MORT =====
    // FORMULE : Première année où cumulativeSavings > 0
    // LOGIQUE : Quand l'investissement commence à rapporter
    const breakEvenYearIndex = details.findIndex(d => d.cumulativeSavings > 0);
    const breakEvenPoint = breakEvenYearIndex !== -1 ? breakEvenYearIndex + 1 : 30;
    
    // ===== INDICATEURS ANNÉE 1 (Court Terme) =====
    const year1 = details[0];
    const newMonthlyBillYear1 = year1.totalWithSolar / 12;
    const oldMonthlyBillYear1 = year1.edfBillWithoutSolar / 12;
    
    // FORMULE : Effort Mensuel = Nouveau Budget - Ancien Budget
    // EXEMPLE : (2278.50/12) - (1595/12) = 189.88€ - 132.92€ = +56.96€/mois (Effort)
    const monthlyEffortYear1 = newMonthlyBillYear1 - oldMonthlyBillYear1;
    
    // ===== INDICATEURS DE PERFORMANCE =====
    const averageYearlyGain = projectionYears > 0 ? totalSavingsProjected / projectionYears : 0;
    const costOfInactionPerSecond = Math.max(0.0001, averageYearlyGain / (365 * 24 * 3600));

    const effectiveCost = localInstallCost > 0 ? localInstallCost : 20000; 
    
    // FORMULE : ROI % = (Gain Annuel Moyen / Investissement) × 100
    // EXEMPLE : (500€ / 20000€) × 100 = 2.5% de rentabilité annuelle
    const roiPercentage = effectiveCost > 0 
      ? ((totalSavingsProjected / projectionYears) / effectiveCost) * 100 
      : 0;
    
    // FORMULE : Capital Bancaire Équivalent = Gain Annuel / Taux Livret A (3%)
    // EXEMPLE : 500€ / 0.03 = 16 667€ à bloquer pour générer 500€/an d'intérêts
    const bankEquivalentCapital = averageYearlyGain / 0.03;

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
      installCost: localInstallCost
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

  // Valeurs pour le Bilan Total (Barres Custom)
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
              <Settings className="w-4 h-4" /> Modifier Paramètres
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
              
              {/* Prix Électricité */}
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

              {/* Production Annuelle */}
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

              {/* Taux Autoconsommation */}
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

              {/* Coût Installation */}
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

              {/* Mensualité Crédit */}
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

              {/* Assurance Mensuelle */}
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

              {/* Durée Crédit */}
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
                <span>Les graphiques et calculs se mettent à jour automatiquement quand vous modifiez les valeurs.</span>
              </p>
            </div>
          </div>
        )}

         {/* --- TICKING BOMB --- */}
         <div className="relative group cursor-help" onClick={() => setShowInactionInfo(!showInactionInfo)}>
           <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 hover:bg-red-500/15 transition-colors">
               <div className="flex items-center gap-4">
                   <div className="bg-red-500/20 p-3 rounded-full animate-pulse">
                       <Timer className="w-6 h-6 text-red-500" />
                   </div>
                   <div>
                       <h3 className="text-red-500 font-bold uppercase tracking-widest text-xs mb-1 flex items-center gap-2">
                         Coût de l'inaction (Temps Réel) <Info className="w-3 h-3" />
                       </h3>
                       <p className="text-zinc-400 text-sm">Votre perte financière cumulée depuis que vous êtes sur cette page.</p>
                   </div>
               </div>
               <div className="text-4xl md:text-5xl font-mono font-black text-red-500 tabular-nums tracking-tighter drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                   -{wastedCash.toFixed(4)} €
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
                 {/* CERCLE AUTONOMIE */}
                 <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90 filter drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                      {/* Fond du cercle */}
                      <circle cx="72" cy="72" r="60" fill="transparent" stroke="#064e3b" strokeWidth="8" />
                      {/* Cercle de progression */}
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
                    <p className="text-zinc-500 text-sm mt-1">Calculé sur une consommation de <span className="text-white font-bold">{formatKwh(calculationResult.baseConsumptionKwh)} kWh/an</span></p>
                 </div>
             </div>
             <div className="relative z-10 bg-emerald-500/10 px-6 py-4 rounded-2xl border border-emerald-500/20 text-center md:text-right min-w-[200px]">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Gain Total Projeté</div>
                <div className="text-4xl font-black text-white tracking-tighter">{formatEUR(calculationResult.totalSavingsProjected)}</div>
             </div>
        </div>

        {/* --- HERO SECTION --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* CARTE PRINCIPALE : LE GAIN NET */}
          <div className="lg:col-span-8 relative group flex">
             <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-teal-400 rounded-[32px] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
             
             <div className="relative w-full bg-zinc-900/80 backdrop-blur-sm rounded-[30px] border border-white/10 p-8 flex flex-col justify-between overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <Wallet className="w-64 h-64 text-blue-500" />
                </div>
                
                <div className="relative z-10">
                   <div className="flex flex-wrap items-center gap-3 mb-6">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
                          <Lock className="w-3 h-3" /> Projection sur {projectionYears} ans
                      </div>
                   </div>
                   
                   <h1 className="text-zinc-400 font-medium text-lg mb-2">Capital Sauvegardé (Net d'Impôts)</h1>
                   <div className="flex items-baseline gap-4 flex-wrap">
                     <span className={`text-5xl md:text-8xl font-black tracking-tighter drop-shadow-2xl ${calculationResult.totalSavingsProjected > 0 ? 'text-white' : 'text-red-500'}`}>
                       {formatEUR(calculationResult.totalSavingsProjected)}
                     </span>
                   </div>
                   <p className="text-zinc-400 mt-4 max-w-lg leading-relaxed border-l-2 border-blue-500 pl-4">
                     C'est la somme exacte qui restera sur votre compte en banque au lieu de partir chez votre fournisseur. Une rente défiscalisée, garantie et transmissible.
                   </p>
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
                     <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Point Mort</div>
                     <div className="text-2xl font-bold text-white">{calculationResult.breakEvenPoint} ans</div>
                   </div>
                   <div>
                     <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Investissement</div>
                     <div className="text-2xl font-bold text-zinc-400">{formatEUR(calculationResult.installCost)}</div>
                   </div>
                </div>
             </div>
          </div>

          {/* SIDEBAR : EFFORT D'ÉPARGNE & COMPARAISON MENSUELLE */}
          <div className="lg:col-span-4 space-y-6 flex flex-col h-full">
             
             {/* COMPARATIF BANCAIRE */}
             <div className="bg-gradient-to-br from-indigo-900/40 to-black border border-indigo-500/30 rounded-[30px] p-6 relative overflow-hidden flex-1">
                <div className="flex items-center gap-2 mb-4">
                   <Landmark className="w-5 h-5 text-indigo-400" />
                   <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Équivalent Bancaire</h3>
                </div>
                <p className="text-sm text-zinc-400 mb-4">
                   Pour générer <span className="text-white font-bold">{formatEUR(calculationResult.averageYearlyGain)}/an</span> d'intérêts avec votre banque, vous devriez bloquer cette somme sur un compte :
                </p>
                <div className="text-3xl font-black text-white mb-2 tracking-tight">
                   {formatEUR(calculationResult.bankEquivalentCapital)}
                </div>
                <div className="text-[10px] bg-indigo-500/20 text-indigo-300 inline-block px-2 py-1 rounded font-bold">
                   ICI, VOUS NE BLOQUEZ RIEN.
                </div>
             </div>

             {/* CARTE : EFFORT D'ÉPARGNE MENSUEL */}
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
                                    C'est la différence entre ce que vous payez aujourd'hui et ce que vous paierez demain.
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-baseline gap-2">
                             <span className={`text-4xl font-black ${calculationResult.monthlyEffortYear1 > 0 ? 'text-white' : 'text-emerald-400'}`}>
                                {calculationResult.monthlyEffortYear1 > 0 ? '+' : ''}{formatMoney(Math.abs(calculationResult.monthlyEffortYear1))}
                             </span>
                             <span className="text-sm text-zinc-500 font-bold">/mois</span>
                        </div>

                        {/* EXPLICATION DU CALCUL */}
                        <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                           <div className="text-[10px] font-mono text-zinc-500 mb-2 uppercase tracking-wide">Détail du calcul :</div>
                           <div className="flex justify-between text-xs text-zinc-400">
                               <span>Crédit + Reste Facture :</span>
                               <span className="font-bold text-white">{formatMoney(calculationResult.newMonthlyBillYear1)}</span>
                           </div>
                           <div className="flex justify-between text-xs text-zinc-400">
                               <span>Ancienne Facture :</span>
                               <span className="font-bold text-red-400">- {formatMoney(calculationResult.oldMonthlyBillYear1)}</span>
                           </div>
                           <div className={`flex justify-between text-xs font-bold pt-1 border-t border-white/10 ${calculationResult.monthlyEffortYear1 > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                               <span>= {calculationResult.monthlyEffortYear1 > 0 ? "Effort" : "Gain"}</span>
                               <span>{calculationResult.monthlyEffortYear1 > 0 ? '+' : ''}{formatMoney(Math.abs(calculationResult.monthlyEffortYear1))}</span>
                           </div>
                        </div>
                    </div>
                </div>
             </div>

          </div>
        </div>

        {/* --- GRAPH 3 : BILAN TOTAL SUR N ANS (CUSTOM BARS) --- */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-[32px] p-8 backdrop-blur-sm">
           <h2 className="text-xl font-black text-white mb-8 flex items-center gap-3">
              <Scale className="text-white" /> BILAN TOTAL SUR {projectionYears} ANS
           </h2>
           
           <div className="flex flex-col gap-8">
               {/* BARRE 1 : SANS SOLAIRE */}
               <div className="group">
                  <div className="flex justify-between items-end mb-3">
                     <span className="text-zinc-400 font-bold uppercase text-xs tracking-wider flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div> Situation Actuelle (Perte Sèche)
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
                  <p className="text-xs text-red-500/60 mt-2 font-mono ml-1">Argent perdu définitivement chez le fournisseur.</p>
               </div>

               {/* BARRE 2 : AVEC SOLAIRE */}
               <div className="group">
                  <div className="flex justify-between items-end mb-3">
                     <span className="text-zinc-400 font-bold uppercase text-xs tracking-wider flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div> Avec Solaire (Investissement)
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
                      <p className="text-xs text-blue-500/60 font-mono ml-1">Dépense transformée en patrimoine.</p>
                      <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg text-sm font-bold border border-emerald-500/20">
                          Vous économisez {formatEUR(calculationResult.totalSpendNoSolar - calculationResult.totalSpendSolar)}
                      </div>
                  </div>
               </div>
           </div>
        </div>


        {/* --- COMPARATIF LOCATAIRE VS PROPRIETAIRE --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
           {/* Option A: FOURNISSEUR ACTUEL */}
           <div className="bg-red-950/10 border border-red-900/30 rounded-[24px] p-6 relative overflow-hidden flex flex-col h-full group hover:bg-red-950/20 transition-colors">
              <div className="flex items-start gap-5 mb-4">
                  <div className="p-3 bg-red-500/10 rounded-xl shrink-0 border border-red-500/20 group-hover:scale-105 transition-transform mt-1">
                     <Ban className="w-8 h-8 text-red-500" />
                  </div>
                  <div className="flex-1">
                     <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold text-white">LOCATAIRE DU RÉSEAU</h3>
                        <span className="text-[10px] font-bold uppercase bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Le Passé</span>
                     </div>
                     <p className="text-red-400/90 text-sm font-medium leading-relaxed">
                        Vous payez un loyer énergétique à fonds perdus qui augmente chaque année.
                     </p>
                  </div>
              </div>
              
              <ul className="space-y-3 mb-6 flex-1">
                 <li className="flex items-center gap-2 text-xs text-zinc-300">
                     <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" /> 
                     <span>Vous subissez 100% des hausses de tarifs.</span>
                 </li>
                 <li className="flex items-center gap-2 text-xs text-zinc-300">
                     <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" /> 
                     <span>0€ de capital créé à la fin (Facture éternelle).</span>
                 </li>
                 <li className="flex items-center gap-2 text-xs text-zinc-300">
                     <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" /> 
                     <span>Dépendance totale aux marchés de l'énergie.</span>
                 </li>
              </ul>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-auto">
                 <div className="h-full bg-red-600 w-full animate-pulse"></div>
              </div>
           </div>

           {/* Option B: SOLAIRE (MISE EN AVANT) */}
           <div className="bg-gradient-to-r from-blue-900/30 to-black border border-blue-500/40 rounded-[24px] p-6 relative overflow-hidden flex flex-col h-full shadow-lg shadow-blue-500/10 group hover:border-blue-500/60 transition-all">
              <div className="flex items-start gap-5 mb-4">
                  <div className="p-3 bg-blue-500 rounded-xl shrink-0 shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform mt-1">
                     <Crown className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                     <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold text-white">PROPRIÉTAIRE PRODUCTEUR</h3>
                        <span className="text-[10px] font-bold uppercase bg-blue-500 text-white px-2 py-0.5 rounded shadow-lg shadow-blue-500/50">L'Avenir</span>
                     </div>
                     <p className="text-blue-300 text-sm font-medium leading-relaxed">
                        Vous devenez propriétaire de votre centrale et bloquez votre coût énergétique.
                     </p>
                  </div>
              </div>

              <ul className="space-y-3 mb-6 flex-1">
                 <li className="flex items-center gap-2 text-xs text-zinc-300">
                     <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> 
                     <span>Prix du kWh bloqué et garanti pour 30 ans.</span>
                 </li>
                 <li className="flex items-center gap-2 text-xs text-zinc-300">
                     <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> 
                     <span>Votre facture devient un investissement patrimonial.</span>
                 </li>
                 <li className="flex items-center gap-2 text-xs text-zinc-300">
                     <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> 
                     <span>Indépendance et sécurité énergétique (Auto-consommation).</span>
                 </li>
              </ul>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-auto">
                 <div className="h-full bg-blue-500 w-[70%]"></div>
              </div>
           </div>
        </div>

        {/* --- SECTION GARANTIES BLINDÉES --- */}
        <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-[24px]">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <ShieldAlert className="text-amber-500 w-5 h-5" /> BLINDAGE & SÉCURITÉ TOTALE
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { title: "Panneaux", val: "À VIE", sub: "Garantie Performance", detail: "Perte Max 0.4%/an", icon: Sun },
                    { title: "Micro-Onduleurs", val: "À VIE", sub: "Garantie Pièce", detail: "Remplacement à neuf", icon: Zap },
                    { title: "Main d'Oeuvre", val: "À VIE", sub: "Intervention Incluse", detail: "Aucun frais cachés", icon: Wrench },
                    { title: "Déplacement", val: "À VIE", sub: "Partout en France", detail: "Service Premium", icon: Truck },
                ].map((item, i) => (
                    <div key={i} className="bg-gradient-to-br from-amber-500/10 to-yellow-600/5 border border-amber-500/20 p-4 rounded-xl flex flex-col items-center text-center group hover:bg-amber-500/10 transition-colors">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center mb-2 text-amber-500">
                            <item.icon className="w-5 h-5" />
                        </div>
                        <div className="text-2xl font-black text-amber-400 mb-0 leading-none">{item.val}</div>
                        <div className="text-white font-bold text-[10px] uppercase tracking-wide mt-1">{item.title}</div>
                        <div className="mt-2 py-0.5 px-2 bg-amber-500/10 rounded-full text-[9px] text-amber-300 font-bold border border-amber-500/20">
                            {item.detail}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* --- GRAPH 1 : BUDGET MENSUEL STRUCTURE (BARRES HORIZONTALES) --- */}
         <div className="bg-zinc-900/50 border border-white/10 rounded-[30px] p-8 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-zinc-400" />
                    <h3 className="text-lg font-bold uppercase tracking-wider text-white">Structure du Budget (Mensuel)</h3>
                </div>
                <div className="text-xs bg-zinc-800 px-3 py-1 rounded-full text-zinc-400 border border-white/5">
                    Année 1 - Comparatif Immédiat
                </div>
            </div>
            
            <div className="space-y-6">
                {/* BARRE 1 : SANS SOLAIRE */}
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

                {/* BARRE 2 : AVEC SOLAIRE */}
                <div className="relative">
                   <div className="flex justify-between items-end text-sm font-bold mb-2 z-10 relative">
                      <span className="text-zinc-400 uppercase tracking-wider text-xs">Projet Solaire</span>
                      <span className="text-white text-lg">{formatMoney(calculationResult.newMonthlyBillYear1)} /mois</span>
                   </div>
                   <div className="h-16 w-full bg-zinc-950 rounded-xl overflow-hidden relative border border-white/5 flex">
                      {/* Partie Crédit */}
                      <div 
                        style={{width: `${(calculationResult.year1.creditPayment / 12 / calculationResult.newMonthlyBillYear1) * 100}%`}} 
                        className="h-full bg-blue-600 flex flex-col justify-center px-4 border-r border-blue-400/30 relative"
                      >
                         <span className="text-[10px] font-black text-blue-200 uppercase tracking-wide">Crédit</span>
                         <span className="text-xs font-bold text-white">{formatMoney(calculationResult.year1.creditPayment / 12)}</span>
                      </div>
                      {/* Partie Reste */}
                      <div 
                        style={{width: `${(calculationResult.year1.edfResidue / 12 / calculationResult.newMonthlyBillYear1) * 100}%`}} 
                        className="h-full bg-amber-500 flex flex-col justify-center px-4 relative"
                      >
                         <span className="text-[10px] font-black text-amber-900 uppercase tracking-wide">Reste Facture</span>
                         <span className="text-xs font-bold text-white">{formatMoney(calculationResult.year1.edfResidue / 12)}</span>
                      </div>
                   </div>
                   
                   {/* Fleche de différence */}
                   <div className="absolute top-1/2 -right-4 translate-x-full -translate-y-1/2 hidden md:block">
                        <div className="bg-zinc-800 text-white text-xs font-bold px-3 py-2 rounded-lg border border-white/10 whitespace-nowrap">
                            Différentiel : {calculationResult.monthlyEffortYear1 > 0 ? '+' : ''}{formatMoney(Math.abs(calculationResult.monthlyEffortYear1))}
                        </div>
                   </div>
                </div>
            </div>
         </div>


        {/* ==================== NOUVEAU GRAPHIQUE : ÉCONOMIES ANNUELLES ==================== */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-[32px] p-8 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-3">
                        <TrendingUp className="text-emerald-500" /> ÉCONOMIES ANNUELLES
                    </h2>
                    <p className="text-zinc-500 text-sm mt-1 max-w-xl">
                        Votre gain net par année (rouge = effort d'investissement, vert = rentabilité)
                    </p>
                </div>
            </div>

            <div className="w-full" style={{ minHeight: '400px' }}>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={calculationResult.slicedDetails} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="barGradientPositive" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                                <stop offset="100%" stopColor="#059669" stopOpacity={0.4}/>
                            </linearGradient>
                            <linearGradient id="barGradientNegative" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8}/>
                                <stop offset="100%" stopColor="#dc2626" stopOpacity={0.4}/>
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
                                value >= 0 ? 'Gain Annuel' : 'Effort Annuel'
                            ]}
                            labelStyle={{ color: '#a1a1aa', marginBottom: '8px', fontSize: '12px' }}
                        />
                        <Bar 
                            dataKey="cashflowDiff" 
                            name="Cashflow Annuel"
                            fill="url(#barGradientPositive)"
                            radius={[8, 8, 0, 0]}
                        >
                            {calculationResult.slicedDetails.map((entry, index) => (
                                <cell key={`cell-${index}`} fill={entry.cashflowDiff >= 0 ? 'url(#barGradientPositive)' : 'url(#barGradientNegative)'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* --- GRAPH 2 : LE GOUFFRE FINANCIER (CISEAUX) AMÉLIORÉ --- */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-[32px] p-8 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-3">
                        <TrendingDown className="text-red-500" /> LE GOUFFRE FINANCIER
                    </h2>
                    <p className="text-zinc-500 text-sm mt-1 max-w-xl">
                        En rouge : L'argent que vous donnez à votre fournisseur. En bleu : Votre investissement borné dans le temps.
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
                    <Table2 className="text-zinc-500" /> Plan de Financement
                </h3>
                
                {/* SWITCH VUE ANNUELLE / MENSUELLE */}
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                   <button 
                     onClick={() => setTableView('yearly')}
                     className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${tableView === 'yearly' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                   >
                     <Calendar className="w-3 h-3" /> Vue Annuelle
                   </button>
                   <button 
                     onClick={() => setTableView('monthly')}
                     className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${tableView === 'monthly' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                   >
                     <CalendarDays className="w-3 h-3" /> Vue Mensuelle
                   </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-black/40 text-[10px] uppercase tracking-wider text-zinc-500 border-b border-white/5">
                            <th className="p-4 font-bold text-center">Année</th>
                            <th className="p-4 font-bold text-red-400">Facture Élec. (Sans Projet)</th>
                            <th className="p-4 font-bold text-blue-400 bg-blue-500/5 border-l border-white/5">Mensualité Crédit</th>
                            <th className="p-4 font-bold text-amber-400 bg-blue-500/5">Reste Facture</th>
                            <th className="p-4 font-bold text-white bg-blue-500/10 border-r border-white/5">Total Décaissé</th>
                            <th className="p-4 font-bold text-center border-r border-white/5">
                               {tableView === 'yearly' ? "EFFORT ANNUEL" : "EFFORT MENSUEL"}
                            </th>
                            <th className="p-4 font-bold text-emerald-400 text-right">Trésorerie Cumulée</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs">
                        {calculationResult.slicedDetails.map((row, index) => {
                            // Si vue mensuelle, on divise tout par 12 (sauf Cumul)
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

        {/* --- AI PITCH SECTION --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 mb-12">
           <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-[32px] p-8">
               <div className="flex items-center gap-3 mb-6">
                   <div className="p-2 bg-purple-500/20 rounded-lg">
                       <Eye className="w-5 h-5 text-purple-400" />
                   </div>
                   <h3 className="text-lg font-bold text-white">Le Constat est Sans Appel</h3>
               </div>
               <div className="prose prose-invert prose-p:text-zinc-400 prose-strong:text-white leading-relaxed">
                   <p>{data.salesPitch}</p>
               </div>
           </div>

           <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/20 rounded-[32px] p-8 flex flex-col justify-center items-center text-center relative overflow-hidden group">
               <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors"></div>
               <div className="relative z-10">
                   <h3 className="text-2xl font-black text-white mb-4">Ne laissez plus votre fournisseur drainer votre compte.</h3>
                   <p className="text-zinc-400 mb-8 max-w-sm mx-auto">Vous avez les chiffres sous les yeux. La seule question qui reste : préférez-vous payer pour rien ou payer pour vous ?</p>
                   
                   <button className="bg-white text-black font-black text-lg px-8 py-4 rounded-xl hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all flex items-center gap-2 mx-auto">
                       BLOQUER CE TARIF MAINTENANT <CheckCircle2 className="w-5 h-5" />
                   </button>
               </div>
           </div>
        </div>

      </main>
    </div>
  );
};
