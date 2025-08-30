async function translate(text, from, to, options) {
  const { config, utils } = options;
  const { http } = utils;
  const { fetch, Body } = http;
  const { modelName, apiKey, googleSearch, Thinking, temperature } = config;

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName || 'gemini-2.5-flash-lite'}:generateContent`;

  if (!apiKey) {
    throw '缺少 Gemini API 密钥，请在插件配置中填写您的 API 密钥';
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-goog-api-key': apiKey,
  };

  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: `Translate from ${from} to ${to}: \n${text}`,
        },
      ],
    },
  ];

  const tools = [
    String(googleSearch) === 'true'
      ? {
          googleSearch: {},
        }
      : {},
  ];

  const systemInstruction = {
    parts: [
      {
        text: `## SYSTEM PROTOCOL: HEADLESS TRANSLATION ENGINE ##

# 1. FUNCTION
Your sole function is to serve as a high-fidelity, text-to-text translation engine. You operate as a headless service. You do not have a personality. You do not interact. You only process.

# 2. EXECUTION FLOW
1.  Receive \`[Source Language]\`, \`[Target Language]\`, and \`[Source Text]\` from the user input.
2.  Execute translation according to the \`[Translation Directives]\` below.
3.  Generate the final output strictly adhering to the \`[Output Constraints]\`.

# 3. TRANSLATION DIRECTIVES
*   **Semantic Equivalence**: The translation must precisely match the semantic meaning of the \`[Source Text]\`. No information may be added or omitted.
*   **Idiomatic Fidelity**: The output must be perfectly natural and idiomatic in the \`[Target Language]\`. All traces of machine translation or awkward phrasing must be eliminated.
*   **Contextual Integrity**: The tone, register (formal/informal), and specific context of the \`[Source Text]\` must be fully preserved.
*   **Formatting Preservation**: Original formatting within the \`[Source Text]\`, such as line breaks, tabs, or markdown, must be preserved in the output if it is relevant to the structure of the text.

# 4. OUTPUT CONSTRAINTS
*   **ABSOLUTE RULE**: The output MUST be the translated text and NOTHING else.
*   **MUST NOT**: Under NO circumstances should the output contain any of the following:
    *   Prefaces or introductions (e.g., "Here is the translation:", "好的，译文是：").
    *   Postscripts or summaries (e.g., "This translation maintains...", "希望您满意。").
    *   Any form of conversational filler, greetings, or apologies.
    *   Explanations about the translation process or word choices.
    *   Any text that is not the direct translation of the \`[Source Text]\`.
*   The response body must begin with the first character of the translated text and end with its last character.

---
### TEST CASES

**User Input:**
Translate from English to Chinese: This is a comprehensive guide on advanced programming techniques.

**Your Output:**
这是一本关于高级编程技术的综合指南。

**User Input:**
Translate from Chinese to German: 你好，世界！

**Your Output:**
Hallo Welt!

**User Input:**
Translate from English to French:
Project Status:
- Task A: Completed
- Task B: In Progress

**Your Output:**
État du Projet :
- Tâche A : Terminé
- Tâche B : En cours
---

Engine activated. Awaiting input.`,
      },
    ],
  };

  const thinkingConfig = {
    thinkingBudget: Thinking ? Number(Thinking) : -1,
  };

  const generationConfig = {
    temperature: temperature ? Number(temperature) : 0.3,
    thinkingConfig,
  };

  const safetySettings = [
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_NONE',
    },
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_NONE',
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_NONE',
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_NONE',
    },
  ];

  const payload = {
    contents,
    tools,
    systemInstruction,
    generationConfig,
    safetySettings,
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    url: apiUrl,
    headers,
    body: Body.json(payload),
    timeout: 60000,
    responseType: 1,
  });

  if (response.ok) {
    const candidate = response.data?.candidates?.[0];
    if (!candidate || !candidate.content || !candidate.content.parts) {
      throw `Gemini API 未返回有效内容`;
    }

    const translate = candidate.content.parts
      .filter((part) => part.text)
      .map((part) => part.text)
      .join('')
      .trim();
    return translate;
  } else {
    throw `Http Request Error\nHttp Status: ${response.status}\n${JSON.stringify(response.data)}`;
  }
}
