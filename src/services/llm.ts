export interface LLMResponse {
  type: 'info' | 'error' | 'success';
  message: string;
  data?: any;
  markers?: Array<{
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
    message: string;
    severity: number;
  }>;
}

export const executeABAPSimulation = async (code: string, apiKey: string, actionType: 'check' | 'run'): Promise<LLMResponse> => {
  if (!code.trim()) {
    return { type: 'error', message: 'Error: Empty code.', data: 'Please write some ABAP code.', markers: [] };
  }

  if (!apiKey) {
    return {
      type: 'error',
      message: 'API Key Required',
      data: 'To operate as a true Eclipse ADT compiler and runtime, this IDE requires a Gemini API key. Please click the Settings gear icon to add one.',
      markers: []
    };
  }

  try {
    const prompt = actionType === 'check' 
      ? `You are a strict ABAP syntax checker (Eclipse ADT equivalent).\nReview the following ABAP code for syntax errors.\nIf there are syntax errors, return ONLY a valid JSON object matching this schema: { "isValid": false, "errors": [{ "startLineNumber": 1, "startColumn": 1, "endLineNumber": 1, "endColumn": 10, "message": "error description" }] }.\nIf it is perfectly valid and executable ABAP code, return { "isValid": true, "errors": [] }.\nDon't include markdown backticks like \`\`\`json. Return pure JSON string.\n\nCode:\n${code}`
      : `You are an ABAP compilation and execution engine. Execute the following ABAP code and capture its standard output (e.g., from WRITE statements, CL_DEMO_OUTPUT, etc.).\nRemember to process DO loops, template strings, internal tables, and method calls correctly.\nReturn ONLY a valid JSON object matching this schema: { "hasSyntaxError": false, "output": "exact simulated output as string" }. If there's a syntax error that prevents execution, return { "hasSyntaxError": true, "errorDescription": "..." }.\nDon't include markdown backticks like \`\`\`json. Return pure JSON string.\n\nCode:\n${code}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 }
      })
    });

    if (!response.ok) {
      throw new Error('API Request failed. Check your API key.');
    }

    const json = await response.json();
    let textResponse = json.candidates[0].content.parts[0].text;
    
    // Clean up potential markdown JSON formatting
    textResponse = textResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    
    const parsed = JSON.parse(textResponse);

    if (actionType === 'check') {
      if (parsed.isValid) {
        return { type: 'success', message: 'Syntax Check OK', data: 'No syntax errors found. Code is active.', markers: [] };
      } else {
        const markers = (parsed.errors || []).map((e: any) => ({
          ...e,
          severity: 8 // Error
        }));
        return { type: 'error', message: 'Syntax Checks Failed', data: `Found ${markers.length} errors.`, markers };
      }
    } else {
      if (parsed.hasSyntaxError) {
        return { type: 'error', message: 'Execution Failed', data: parsed.errorDescription || 'Syntax error execution blocked.', markers: [] };
      } else {
        return { type: 'success', message: 'Execution Completed', data: parsed.output || 'No output generated.', markers: [] };
      }
    }
  } catch (err: any) {
    return {
      type: 'error',
      message: 'LLM Engine Error',
      data: err.message || 'Failed to parse LLM simulation response.',
      markers: []
    };
  }
};
