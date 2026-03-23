export interface AIRecommendation {
    analysis: string;
    suggestedSteps: string[];
    priority: "Alta" | "Media" | "Baja";
}

export const aiService = {
    // This is a placeholder for DeepSeek/OpenAI integration
    // In a real scenario, this would call an API route or a cloud function
    analyzeTask: async (task: any, logs: any[]): Promise<AIRecommendation> => {
        console.log("aiService.analyzeTask - Analyzing context:", { task, logsCount: logs.length });

        // Simulating API Latency
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Basic AI Logic (Mocked for now)
        const logContent = logs.map(l => l.details).join(". ");

        // Simple rules to simulate "Intelligence"
        if (task.priority === "Alta" && logs.length > 5) {
            return {
                analysis: "Esta tarea crítica ha tenido mucha actividad pero sigue pendiente. Parece haber un cuello de botella en la ejecución.",
                suggestedSteps: [
                    "Reunión de emergencia con el equipo",
                    "Escalar a nivel directivo",
                    "Dividir en sub-tareas más pequeñas"
                ],
                priority: "Alta"
            };
        }

        return {
            analysis: "La tarea parece estar progresando normalmente. El flujo de actividad sugiere que se completará a tiempo.",
            suggestedSteps: [
                "Continuar con el seguimiento diario",
                "Verificar hitos intermedios",
                "Solicitar actualización al responsable"
            ],
            priority: "Media"
        };
    }
};
