import { GoogleGenAI } from "@google/genai";
import { Product, Transaction } from "../types";

// Note: In a real app, never expose API keys on the client side.
// This is for demonstration using the provided environment variable pattern.
const getAIClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateProductDescription = async (name: string, category: string): Promise<string> => {
  try {
    const ai = getAIClient();
    const prompt = `Write a short, catchy, 1-sentence product description for a university campus store item.
    Product Name: ${name}
    Category: ${category}
    Keep it appealing to students.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No description generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Description generation unavailable.";
  }
};

export const analyzeBusinessMetrics = async (transactions: Transaction[], products: Product[]): Promise<string> => {
  try {
    const ai = getAIClient();
    
    // Summarize data to avoid token limits
    const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0).toFixed(2);
    const lowStockItems = products.filter(p => p.stock < 10).map(p => p.name).join(', ');
    const recentSalesCount = transactions.length;

    const prompt = `Analyze this retail data for CampusMart:
    - Total Revenue: $${totalRevenue}
    - Recent Transaction Count: ${recentSalesCount}
    - Low Stock Items: ${lowStockItems || "None"}

    Provide a concise (max 3 bullet points) business insight summary focusing on action items for the store manager.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No insights available.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "AI Insights currently unavailable.";
  }
};