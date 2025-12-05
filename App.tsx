import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultsDashboard } from './components/ResultsDashboard';
import { parseExcelFile } from './services/excelService';
import { analyzeSolarData } from './services/geminiService';
import { AppState, SimulationResult } from './types';

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [simulationData, setSimulationData] = useState<SimulationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleFileSelect = async (file: File) => {
    try {
      setAppState(AppState.ANALYZING);
      const rawData = await parseExcelFile(file);
      const result = await analyzeSolarData(rawData);
      setSimulationData(result);
      setAppState(AppState.DASHBOARD);
    } catch (err) {
      console.error(err);
      setErrorMsg("Impossible de lire ce fichier. Assurez-vous qu'il contient des données de consommation.");
      setAppState(AppState.ERROR);
    }
  };

  const handleTextSubmit = async (text: string) => {
    try {
      setAppState(AppState.ANALYZING);
      const result = await analyzeSolarData(text);
      setSimulationData(result);
      setAppState(AppState.DASHBOARD);
    } catch (err) {
      console.error(err);
      setErrorMsg("L'IA n'a pas réussi à comprendre ces données. Essayez de copier le tableau plus proprement.");
      setAppState(AppState.ERROR);
    }
  };

  const resetApp = () => {
    setAppState(AppState.UPLOAD);
    setSimulationData(null);
    setErrorMsg('');
  };

  if (appState === AppState.DASHBOARD && simulationData) {
    return <ResultsDashboard data={simulationData} onReset={resetApp} />;
  }

  return (
    <div className="min-h-screen bg-[#020202] flex flex-col font-sans selection:bg-yellow-500 selection:text-black overflow-hidden">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[150px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-yellow-900/10 rounded-full blur-[150px]"></div>
          <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[800px] h-[800px] bg-blue-900/5 rounded-full blur-[120px]"></div>
          {/* Noise Texture */}
          <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`}}></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center z-10 relative w-full pt-12 md:pt-0">
        {appState === AppState.ERROR && (
           <div className="mb-8 p-6 bg-red-950/30 border border-red-500/30 text-red-200 rounded-2xl max-w-md text-center backdrop-blur-md animate-in fade-in slide-in-from-top-4">
             <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
               <span className="text-2xl">⚠️</span>
             </div>
             <p className="font-bold text-lg mb-2">Erreur d'analyse</p>
             <p className="text-sm opacity-80 mb-6">{errorMsg}</p>
             <button onClick={resetApp} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-xl transition-colors">
               Réessayer
             </button>
           </div>
        )}

        <FileUpload 
          onFileSelect={handleFileSelect} 
          onTextSubmit={handleTextSubmit}
          isLoading={appState === AppState.ANALYZING} 
        />
      </div>

      <footer className="py-8 text-center z-10 border-t border-white/5 bg-[#020202]/50 backdrop-blur-sm mt-auto">
        <p className="text-zinc-600 text-[10px] font-bold tracking-[0.2em] uppercase">
          SolarElite Intelligence • Propulsé par Gemini AI
        </p>
      </footer>
    </div>
  );
}