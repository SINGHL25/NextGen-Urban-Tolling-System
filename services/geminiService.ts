import { GoogleGenAI } from "@google/genai";
import { SimulationState, Device, Alarm, Transaction } from '../types';

let aiClient: GoogleGenAI | null = null;

if (process.env.API_KEY) {
  aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const generateAIResponse = async (
  prompt: string,
  context: {
    devices: Device[];
    alarms: Alarm[];
    simulation: SimulationState;
    recentTransactions: Transaction[];
  }
): Promise<string> => {
  if (!aiClient) {
    return "Demo Mode: AI Assistant is unavailable. Please configure the API_KEY in the environment to enable the Gemini Neural Engine.";
  }

  const systemContext = `
    You are the AI Operations Assistant for the NextGen Urban Tolling System (STTP).
    Your role is to assist the Network Operations Center (NOC) operators.
    
    CURRENT SYSTEM STATUS:
    - Simulation Time: ${context.simulation.timeOfDay}:00
    - Weather: ${context.simulation.weather}
    - Traffic Volume: ${context.simulation.trafficVolume}%
    - Active Alarms: ${context.alarms.length}
    - Devices: ${JSON.stringify(context.devices.map(d => ({ name: d.name, status: d.status, temp: d.temperature })))}
    - Recent Transactions: ${context.recentTransactions.length}

    INSTRUCTIONS:
    1. Answer questions about system health, revenue, and device status.
    2. If a device is in WARNING or OFFLINE, explain why based on standard ITS knowledge (e.g., high temp, network lag).
    3. Keep answers professional, concise, and suitable for a technical audience.
    4. Do not mention "simulated data" unless explicitly asked. Treat this as a live production environment.
    5. If asked to "fix" something, suggest a realistic operational procedure (e.g., "Dispatching field technician", "Rebooting Edge Node").
  `;

  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemContext,
      },
      contents: prompt,
    });
    
    return response.text || "No response generated.";
  } catch (error) {
    console.error("AI Generation Error:", error);
    return "System Error: Unable to reach the AI Neural Core. Please check network connectivity.";
  }
};