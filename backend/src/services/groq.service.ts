import Groq from 'groq-sdk';
import { fillPrompt, SPECIALIST_ANALYSIS_PROMPT, EMERGENCY_SUMMARY_PROMPT, DOCUMENT_SCANNER_PROMPT } from '../prompts';

const MODEL = 'llama-3.3-70b-versatile';

// Lazy init — groq-sdk throws if API key is undefined at construction time,
// and dotenv hasn't loaded yet when module is first imported.
function getGroq() {
    return new Groq({ apiKey: process.env.GROQ_API_KEY });
}


// ── Symptom Analysis ─────────────────────────────────────────────
export async function analyzeSymptoms(params: {
    heartRate?: string;
    spO2?: string;
    age?: string;
    symptoms: string;
}) {
    const prompt = fillPrompt(SPECIALIST_ANALYSIS_PROMPT, {
        heartRate: params.heartRate || 'N/A',
        spO2: params.spO2 || 'N/A',
        age: params.age || 'N/A',
        symptoms: params.symptoms,
    });

    const completion = await getGroq().chat.completions.create({
        model: MODEL,
        messages: [
            {
                role: 'system',
                content: 'You are a precise medical triage assistant. Always respond with valid JSON only. No markdown, no explanation outside of JSON.',
            },
            { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 512,
        response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw);

    return {
        specialistType: parsed.specialistType ?? 'general_physician',
        urgencyLevel: parsed.urgencyLevel ?? 'low',
        reasoning: parsed.reasoning ?? 'Unable to analyze — please consult a doctor.',
        analyzedAt: new Date().toISOString(),
        aiModel: MODEL,
        tokensUsed: completion.usage?.total_tokens ?? 0,
    };
}

// ── Emergency Summary ────────────────────────────────────────────
export async function generateEmergencySummary(params: {
    metadataJson: string;
    emergencyDescription: string;
    patientCondition: string;
    heartRate?: string;
    spO2?: string;
    age?: string;
}) {
    const prompt = fillPrompt(EMERGENCY_SUMMARY_PROMPT, {
        metadata_json: params.metadataJson,
        emergency_description: params.emergencyDescription,
        patient_condition: params.patientCondition,
        heart_rate: params.heartRate || 'N/A',
        spo2: params.spO2 || 'N/A',
        age: params.age || 'N/A',
    });

    const completion = await getGroq().chat.completions.create({
        model: MODEL,
        messages: [
            {
                role: 'system',
                content: 'You are an emergency medical AI. Respond with valid JSON only.',
            },
            { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    return JSON.parse(raw);
}

// ── Document Scanner ─────────────────────────────────────────────
export async function scanMedicalDocument(ocrText: string) {
    const prompt = fillPrompt(DOCUMENT_SCANNER_PROMPT, {
        ocr_raw_text: ocrText,
    });

    const completion = await getGroq().chat.completions.create({
        model: MODEL,
        messages: [
            {
                role: 'system',
                content: 'You are a medical document analyzer. Respond with valid JSON only.',
            },
            { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    return JSON.parse(raw);
}
