type SupplierDecisionInput = {
  supplier: unknown;
  process: unknown;
  evaluations: unknown[];
  sanctions: unknown;
  claims: unknown[];
  observations: unknown[];
  contracts: unknown[];
  deliveries: unknown[];
  previousAwards: unknown[];
};

const SCORE_KEYS = [
  "recommendation_score",
  "recommendationScore",
  "recommendation",
  "decision",
  "score",
  "value",
  "answer",
  "prediction",
  "result",
  "output",
  "answers",
  "responses",
  "questions",
  "response",
  "data",
];
const SCORE_LEVELS = [
  "0/100: Muy poco recomendable; predominan señales importantes de riesgo.",
  "10/100: Poco recomendable; varias señales negativas y evidencia favorable limitada.",
  "20/100: Recomendabilidad baja; las señales negativas pesan más que las favorables.",
  "30/100: Recomendabilidad limitada; hay riesgos relevantes por revisar.",
  "40/100: Algo por debajo de lo recomendable; evidencia mixta con riesgos pendientes.",
  "50/100: Recomendabilidad intermedia; señales favorables y desfavorables equilibradas.",
  "60/100: Moderadamente recomendable; hay más señales favorables que riesgos.",
  "70/100: Recomendable; buen historial disponible y riesgos acotados.",
  "80/100: Muy recomendable; evidencia favorable consistente y pocos riesgos.",
  "90/100: Altamente recomendable; evidencia favorable sólida y riesgos menores.",
  "100/100: Excelente recomendabilidad según toda la evidencia disponible.",
];

function numericScore(value: unknown): number | null {
  const score =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(score) && score >= 0 && score <= 100
    ? Math.round(score)
    : null;
}

function extractScore(value: unknown): number | null {
  const directScore = numericScore(value);
  if (directScore !== null) return directScore;
  if (!value || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const score = extractScore(item);
      if (score !== null) return score;
    }
    return null;
  }

  const response = value as Record<string, unknown>;
  if (response.type === "score" && "score" in response) {
    const levelScore = Number(response.score);
    const legend = response.legend;
    const levelCount =
      legend && typeof legend === "object" && !Array.isArray(legend)
        ? Object.keys(legend).length
        : SCORE_LEVELS.length;
    if (
      Number.isFinite(levelScore) &&
      levelCount > 1 &&
      levelScore >= 0 &&
      levelScore <= levelCount - 1
    ) {
      return Math.round((levelScore / (levelCount - 1)) * 100);
    }
  }

  for (const key of SCORE_KEYS) {
    if (!(key in response)) continue;
    const score = extractScore(response[key]);
    if (score !== null) return score;
  }

  return null;
}

export async function predictSupplierRecommendation(
  input: SupplierDecisionInput,
): Promise<number> {
  const endpoint =
    process.env.LAYA_PREDICT_URL || "http://localhost:8000/v1/predict";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      state: { body: JSON.stringify(input) },
      questions: {
        recommendation_score: {
          type: "score",
          criteria: SCORE_LEVELS,
          instructions:
            "Evalúa qué tan recomendable es este proveedor para el proceso. Elige el nivel de criteria que mejor represente la evaluación global; sus índices van de 0 (0/100, muy poco recomendable) a 10 (100/100, excelente). Considera las evaluaciones internas, calidad, cumplimiento, reincidencias, amonestaciones e inhabilitaciones, reclamos, observaciones y antecedentes contractuales. No inventes datos ni penalices la ausencia de información; distingue entre que no haya sanciones y que no estén informadas. Una sanción es una señal relevante, pero no determina automáticamente la elegibilidad del proveedor.",
        },
      },
    }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Laya prediction failed: HTTP ${response.status}`);
  }

  const payload: unknown = await response.json();
  const score = extractScore(payload);
  if (score === null) {
    throw new Error("Laya response did not contain a score from 0 to 100");
  }
  return score;
}
