
import { GoogleGenAI, Type } from "@google/genai";
import { SimulationResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeSolarData = async (input: any[] | string): Promise<SimulationResult> => {
  
  const dataContext = typeof input === 'string' 
    ? `DONNÉES BRUTES / FORMULAIRE :\n${input}`
    : `DONNÉES EXCEL JSON :\n${JSON.stringify(input).substring(0, 20000)}`;

  const prompt = `
    Tu es "LE CLOSER", l'analyste financier le plus redoutable d'EDF SOLAIRES.
    Ton but n'est pas d'informer, mais de VENDRE. Tu dois créer un sentiment d'urgence absolue.
    
    ATTENTION AU VOCABULAIRE :
    - Tu représentes "EDF SOLAIRES" (La Solution).
    - Le client a une facture chez un "FOURNISSEUR D'ÉNERGIE" (Le Problème).
    - NE DIS JAMAIS "Facture EDF" pour parler de ce qu'il paie actuellement (il est peut-être chez Total ou Engie). Dis "Facture Fournisseur", "Facture Élec" ou "Rente Énergétique".
    
    DONNÉES CLIENT :
    ${dataContext}
    
    TA MISSION :
    1. Extraire les variables financières. Si taux absent = 4.9%. Si consommation kWh absente, estime-la via (facture / 0.25).
    2. PITCH DE VENTE (Style "Wolf of Wall Street") : 
       - Sois brutal sur la perte d'argent actuelle.
       - Utilise des mots comme "Hémorragie", "Rente", "Impôt volontaire", "Suicide financier".
       - Compare la facture d'énergie actuelle à un loyer à fond perdu qui augmente sans cesse.
       - Montre que devenir Producteur (avec EDF SOLAIRES) est le SEUL moyen de reprendre le contrôle.
    
    STRUCTURE OUTPUT :
    Retourne un JSON strict avec 'params' (les chiffres) et 'salesPitch' (ton texte de vente).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          params: {
            type: Type.OBJECT,
            properties: {
              currentAnnualBill: { type: Type.NUMBER, description: "Facture énergie annuelle actuelle en €" },
              yearlyConsumption: { type: Type.NUMBER, description: "Consommation annuelle en kWh" },
              inflationRate: { type: Type.NUMBER, description: "Pourcentage inflation (ex: 7)" },
              electricityPrice: { type: Type.NUMBER, description: "Prix du kWh en € (ex: 0.25)" },
              installCost: { type: Type.NUMBER, description: "Coût total installation en €" },
              yearlyProduction: { type: Type.NUMBER, description: "Production en kWh/an" },
              selfConsumptionRate: { type: Type.NUMBER, description: "Taux d'autoconsommation en % (ex: 70)" },
              creditMonthlyPayment: { type: Type.NUMBER, description: "Mensualité crédit en €" },
              insuranceMonthlyPayment: { type: Type.NUMBER, description: "Assurance crédit mois en €" },
              creditDurationMonths: { type: Type.NUMBER, description: "Durée crédit en mois (ex: 180)" },
              creditInterestRate: { type: Type.NUMBER, description: "Taux du crédit en % (ex: 4.5)" }
            },
            required: ["currentAnnualBill", "yearlyConsumption", "inflationRate", "electricityPrice", "installCost", "yearlyProduction", "selfConsumptionRate", "creditMonthlyPayment", "insuranceMonthlyPayment", "creditDurationMonths", "creditInterestRate"]
          },
          salesPitch: { type: Type.STRING, description: "Texte de vente agressif et motivant" },
          psychologicalHook: { type: Type.STRING, description: "Phrase choc sur la perte d'argent" },
          co2Saved: { type: Type.NUMBER, description: "Estimation tonnes CO2 sur 25 ans" }
        },
        required: ["params", "salesPitch", "psychologicalHook", "co2Saved"]
      }
    }
  });

  if (!response.text) {
    throw new Error("Erreur d'analyse IA. Réessayez.");
  }

  const result = JSON.parse(response.text) as SimulationResult;
  return result;
};
