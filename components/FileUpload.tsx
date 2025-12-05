
import React, { useRef, useState } from 'react';
import { FileSpreadsheet, UploadCloud, Search, PenTool, TrendingDown, Sun, Calculator, ArrowRight, Zap } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onTextSubmit: (text: string) => void;
  isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, onTextSubmit, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [mode, setMode] = useState<'upload' | 'form'>('form'); 
  const inputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    currentBillYear: '', // Facture actuelle / an
    yearlyConsumption: '', // Nouveau champ kWh
    inflation: '7',
    pricePerKwh: '0.25', // Prix du kWh
    
    installPrice: '',
    production: '', // kWh
    selfConsumption: '70', // %
    
    creditMonthly: '', // Mensualité
    insuranceMonthly: '0',
    creditDuration: '180', // mois
    creditRate: '4.9', // Taux %
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = () => {
    // Structure très claire pour que l'IA extraie juste les variables
    const structuredPrompt = `
      MODE SAISIE MANUELLE - PARAMÈTRES FINANCIERS:
      
      1. SITUATION CLIENT (FOURNISSEUR ACTUEL):
      - Facture Annuelle: ${formData.currentBillYear}
      - Consommation Annuelle: ${formData.yearlyConsumption} kWh
      - Prix kWh: ${formData.pricePerKwh}
      - Inflation Prévue: ${formData.inflation}
      
      2. SOLUTION SOLAIRE:
      - Coût Installation: ${formData.installPrice}
      - Production Annuelle: ${formData.production}
      - Taux Autoconsommation: ${formData.selfConsumption}
      
      3. FINANCEMENT (CRÉDIT):
      - Mensualité Crédit: ${formData.creditMonthly}
      - Assurance Mensuelle: ${formData.insuranceMonthly}
      - Durée en Mois: ${formData.creditDuration}
      - Taux Crédit (TAEG): ${formData.creditRate}
    `;
    onTextSubmit(structuredPrompt);
  };

  const isFormValid = formData.currentBillYear && formData.creditMonthly && formData.production;

  // Helper calculation for monthly bill
  const monthlyBill = formData.currentBillYear ? (parseFloat(formData.currentBillYear) / 12).toFixed(2) : '0.00';

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pb-12">
      
      {/* Brand Header */}
      <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-600/20 rounded-full px-4 py-1.5 mb-6 backdrop-blur-md">
           <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
           <span className="text-[10px] font-bold text-blue-400 tracking-[0.2em] uppercase">Solution Énergétique Premium</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tighter">
          EDF <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">SOLAIRES</span>
        </h1>
        <p className="text-zinc-500 text-lg font-light max-w-lg mx-auto">
          L'outil de référence pour votre transition énergétique.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex justify-center gap-4 mb-8">
        <button 
          onClick={() => setMode('form')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${mode === 'form' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-zinc-900 text-zinc-500 hover:text-white border border-white/5'}`}
        >
          <PenTool className="w-4 h-4" /> Saisie Manuelle
        </button>
        <button 
          onClick={() => setMode('upload')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${mode === 'upload' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-zinc-900 text-zinc-500 hover:text-white border border-white/5'}`}
        >
          <FileSpreadsheet className="w-4 h-4" /> Fichier Excel
        </button>
      </div>

      {/* Main Content Area */}
      <div className="relative w-full transition-all duration-500">
        
        {/* Loading Overlay */}
        {isLoading && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md rounded-[32px] flex flex-col items-center justify-center border border-blue-500/30">
                <div className="relative w-24 h-24 mb-8">
                   <div className="absolute inset-0 border-2 border-zinc-800 rounded-full"></div>
                   <div className="absolute inset-0 border-2 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                   <Search className="absolute inset-0 m-auto w-8 h-8 text-blue-500 animate-pulse" />
                </div>
                <h3 className="text-3xl font-black text-white mb-2 tracking-tight">ANALYSE EN COURS</h3>
                <p className="text-sm text-blue-400 font-mono animate-pulse">Calcul de rentabilité...</p>
            </div>
        )}

        {mode === 'upload' ? (
          <div
            className={`relative aspect-[16/9] md:aspect-[21/9] flex flex-col items-center justify-center transition-all duration-500 border border-dashed rounded-[32px] cursor-pointer overflow-hidden group backdrop-blur-sm ${
              dragActive 
                ? "border-blue-500 bg-blue-500/10 scale-[1.02]" 
                : "border-zinc-800 bg-black/40 hover:border-zinc-600 hover:bg-zinc-900/40"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".xlsx, .xls, .csv"
              onChange={handleChange}
              disabled={isLoading}
            />
            
            <div className="relative z-10 flex flex-col items-center p-8 text-center">
               <div className="w-20 h-20 bg-zinc-900/80 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-black transition-all duration-500 border border-zinc-800 group-hover:border-blue-500/50">
                <UploadCloud className="w-8 h-8 text-zinc-400 group-hover:text-blue-500 transition-colors" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                Déposer le Fichier Client
              </h3>
              <p className="text-zinc-500 text-sm">Excel (.xlsx) ou CSV</p>
            </div>
          </div>
        ) : (
          <div className="bg-black/40 border border-zinc-800 rounded-[32px] p-6 md:p-10 backdrop-blur-sm">
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                
                {/* COLONNE GAUCHE : FOURNISSEUR (LE PROBLÈME) */}
                <div className="space-y-6">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-red-500/20 rounded-lg border border-red-500/30">
                         <TrendingDown className="w-5 h-5 text-red-500" />
                      </div>
                      <h3 className="text-xl font-black text-white tracking-wide">FOURNISSEUR (ACTUEL)</h3>
                   </div>

                   <div className="space-y-4">
                      {/* LIGNE 1 : FACTURE + CONSO */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Facture / An (€)</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              name="currentBillYear"
                              value={formData.currentBillYear}
                              onChange={handleInputChange}
                              placeholder="2500"
                              className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl px-4 py-3 text-white text-lg font-bold focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder-zinc-700"
                            />
                            {formData.currentBillYear && (
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 font-mono">
                                ~{monthlyBill}/m
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1 flex items-center gap-1">
                              Conso (kWh) <Zap className="w-3 h-3 text-yellow-500" />
                           </label>
                           <input 
                              type="number" 
                              name="yearlyConsumption"
                              value={formData.yearlyConsumption}
                              onChange={handleInputChange}
                              placeholder="10000"
                              className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl px-4 py-3 text-yellow-400 text-lg font-bold focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all placeholder-zinc-700"
                           />
                        </div>
                      </div>
                      
                      {/* LIGNE 2 : INFLATION + PRIX KWH */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Inflation (%)</label>
                           <input 
                            type="number" 
                            name="inflation"
                            value={formData.inflation}
                            onChange={handleInputChange}
                            className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl px-4 py-3 text-white text-lg font-bold focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Prix kWh (€)</label>
                           <input 
                            type="number" 
                            name="pricePerKwh"
                            step="0.01"
                            value={formData.pricePerKwh}
                            onChange={handleInputChange}
                            className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl px-4 py-3 text-white text-lg font-bold focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                   </div>
                </div>

                {/* COLONNE DROITE : SOLAIRE (LA SOLUTION) */}
                <div className="space-y-6 relative">
                   {/* Séparateur vertical desktop */}
                   <div className="hidden md:block absolute left-[-24px] top-10 bottom-10 w-px bg-gradient-to-b from-transparent via-zinc-700 to-transparent"></div>

                   <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                         <Sun className="w-5 h-5 text-blue-500" />
                      </div>
                      <h3 className="text-xl font-black text-white tracking-wide">EDF SOLAIRES</h3>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Mensualité Crédit (€)</label>
                        <input 
                          type="number"
                          name="creditMonthly"
                          value={formData.creditMonthly}
                          onChange={handleInputChange}
                          placeholder="Ex: 180"
                          className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl px-4 py-3 text-emerald-400 text-lg font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-zinc-700"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Assurance (€)</label>
                        <input 
                          type="number"
                          name="insuranceMonthly"
                          value={formData.insuranceMonthly}
                          onChange={handleInputChange}
                          placeholder="Ex: 15"
                          className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl px-4 py-3 text-white text-lg font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-zinc-700"
                        />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1 ml-1">Production (kWh)</label>
                         <input 
                           type="number"
                           name="production"
                           value={formData.production}
                           onChange={handleInputChange}
                           placeholder="Ex: 9000"
                           className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-400 text-sm focus:text-white focus:border-zinc-600 outline-none"
                         />
                      </div>
                      <div>
                         <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1 ml-1">Autoconsommation (%)</label>
                         <input 
                           type="number"
                           name="selfConsumption"
                           value={formData.selfConsumption}
                           onChange={handleInputChange}
                           placeholder="Ex: 70"
                           className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-400 text-sm focus:text-white focus:border-zinc-600 outline-none"
                         />
                      </div>
                   </div>

                   <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/5">
                      <div>
                         <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1 ml-1">Prix Install (€)</label>
                         <input 
                           type="number"
                           name="installPrice"
                           value={formData.installPrice}
                           onChange={handleInputChange}
                           placeholder="Ex: 20000"
                           className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-zinc-400 text-sm focus:text-white focus:border-zinc-600 outline-none"
                         />
                      </div>
                      <div>
                         <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1 ml-1">Durée (mois)</label>
                         <input 
                           type="number"
                           name="creditDuration"
                           value={formData.creditDuration}
                           onChange={handleInputChange}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-zinc-400 text-sm focus:text-white focus:border-zinc-600 outline-none"
                         />
                      </div>
                      <div>
                         <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1 ml-1">Taux (%)</label>
                         <input 
                           type="number"
                           step="0.01"
                           name="creditRate"
                           value={formData.creditRate}
                           onChange={handleInputChange}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-zinc-400 text-sm focus:text-white focus:border-zinc-600 outline-none"
                         />
                      </div>
                   </div>
                </div>
             </div>
             
             <div className="mt-10 flex justify-end">
                <button 
                  onClick={handleFormSubmit}
                  disabled={!isFormValid || isLoading}
                  className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-black text-lg px-8 py-4 rounded-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_30px_rgba(37,99,235,0.4)]"
                >
                  <Calculator className="w-6 h-6 fill-white" /> LANCER L'ANALYSE <ArrowRight className="w-5 h-5" />
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
