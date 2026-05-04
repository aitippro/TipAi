/**
 * P1-1: 多模态提示词引擎
 *
 * 支持三种多模态场景：
 *  - 文生图 (text-to-image): 生成 Stable Diffusion / DALL-E 优化提示词
 *  - 图生文 (image-to-text): 生成图像分析、描述、OCR 等提示词
 *  - 视频分镜 (video-storyboard): 生成视频分镜脚本和镜头描述
 *
 * 通过 LLM 实时生成专业多模态提示词。
 */

import { callAI, callAIVision } from "../../lib/ai-service-v3/client";

export type MultimodalMode = "text-to-image" | "image-to-text" | "video-storyboard";

export interface MultimodalPromptResult {
  mode: MultimodalMode;
  originalRequest: string;
  generatedPrompts: GeneratedPrompt[];
  tips: string[];
  recommendedModel: string;
  usingAI: boolean;
}

// Extended to support expression controls (backward-compatible, optional)
export interface GeneratedPrompt {
  title: string;
  prompt: string;
  negativePrompt?: string;
  parameters?: Record<string, string | number>;
  purpose: string;
  expressionControls?: import("./types/expression").ExpressionControl;
}

// ============================================================================
// AI Prompt 构建
// ============================================================================

function buildTextToImagePrompt(request: string): string {
  return `你是一位专业的 AI 图像生成提示词工程师。请根据用户的描述，生成 4 个不同风格的优化提示词。

用户请求：${request}

请按以下 JSON 数组格式严格输出（不要有任何其他内容）：
[
  {
    "title": "标准版 (DALL-E 3)",
    "prompt": "英文优化后的提示词，包含主体、风格、光线、构图等细节",
    "negativePrompt": "可选的负面提示词",
    "parameters": { "quality": "hd", "style": "vivid" },
    "purpose": "适合 DALL-E 3、Midjourney 等现代模型"
  },
  {
    "title": "细节增强版 (Stable Diffusion)",
    "prompt": "更详细的英文提示词，包含大量质量标签",
    "negativePrompt": "blurry, low quality, distorted, deformed, ugly, bad anatomy",
    "parameters": { "steps": 30, "cfg": 7.5, "sampler": "DPM++ 2M Karras" },
    "purpose": "适合 Stable Diffusion、ComfyUI 等开源模型"
  },
  {
    "title": "极简版 (快速迭代)",
    "prompt": "精简但有效的英文提示词",
    "parameters": { "quality": "standard", "style": "natural" },
    "purpose": "快速验证概念，减少 token 消耗"
  },
  {
    "title": "人像表情控制版 (Portrait w/ FACS)",
    "prompt": "A highly detailed portrait with precise facial expression control using FACS Action Units. Subject: [${request}]. Facial expression: AU1+2 inner brow raise for gentle surprise, AU12 lip corner pull for subtle smile, AU7 eyelid tightener for focused gaze. Lighting: soft natural lighting, Rembrandt lighting style. Camera: 85mm f/1.4 portrait lens, shallow depth of field, sharp focus on eyes. Background: softly blurred bokeh. Quality: 8k, highly detailed skin texture, realistic pores, subtle freckles. Style: hyper-realistic photography, cinematic color grading",
    "negativePrompt": "stiff expression, dead eyes, frozen face, bad anatomy, distorted features, unnatural skin, plastic look, over-smoothed, doll-like eyes",
    "parameters": { "steps": 40, "cfg": 7, "sampler": "DPM++ 2M Karras", "size": "1024x1536" },
    "purpose": "适合可控人像生成，精确控制微表情和面部细节",
    "expressionControls": {
      "punctuationMap": [
        { "punctuation": "，", "auCodes": ["AU1+2"], "intensity": 0.3, "gazeState": "FOCUS", "duration": 200, "easingCurve": "linear" }
      ],
      "sentimentWeight": 0.8,
      "noiseSeed": "portrait_001",
      "noiseAmplitude": 0.05,
      "gazeTransitions": [],
      "exportFormats": ["json", "prompt-text"]
    }
  }
]`;
}

function buildImageToTextPrompt(request: string): string {
  return `你是一位专业的图像分析提示词工程师。请根据用户的分析需求，生成 3 个不同用途的图像分析提示词。

用户请求：${request}

请按以下 JSON 数组格式严格输出（不要有任何其他内容）：
[
  {
    "title": "详细描述",
    "prompt": "请详细描述这张图片。包括：\n1. 主体内容和场景\n2. 色彩、光线、构图\n3. 情感和氛围\n4. 任何文字或标志\n\n用户意图：${request}",
    "purpose": "生成全面的图像描述"
  },
  {
    "title": "结构化分析",
    "prompt": "请对这张图片进行结构化分析，以 JSON 格式输出：\n{\n  "subject": "主体",\n  "setting": "场景环境",\n  "colors": ["主要颜色"],\n  "mood": "情感氛围",\n  "composition": "构图特点",\n  "text_elements": ["图中文字"],\n  "action": "动作或事件"\n}\n\n用户意图：${request}",
    "purpose": "便于程序化处理的结构化输出"
  },
  {
    "title": "创意解读",
    "prompt": "请以创意写作的角度解读这张图片：\n1. 写一个短故事开头（100字以内）\n2. 提出3个可能的标题\n3. 分析图片的象征意义\n\n用户意图：${request}",
    "purpose": "激发创意灵感"
  }
]`;
}

function buildImageToTextVisionPrompt(request: string): string {
  return `请根据用户的分析需求，直接对上传的图片进行分析，生成 3 个不同角度的分析结果。

用户请求：${request}

请按以下 JSON 数组格式严格输出（不要有任何其他内容）：
[
  {
    "title": "详细描述",
    "prompt": "（这里填写你对图片的详细描述，包括主体内容、场景、色彩、光线、构图、情感氛围、文字标志等）",
    "purpose": "生成全面的图像描述"
  },
  {
    "title": "结构化分析",
    "prompt": "（这里填写对图片的结构化分析结果，可以是 JSON 或结构化文本）",
    "purpose": "便于程序化处理的结构化输出"
  },
  {
    "title": "创意解读",
    "prompt": "（这里填写你对图片的创意解读，包括短故事、标题建议、象征意义等）",
    "purpose": "激发创意灵感"
  }
]`;
}

function buildVideoStoryboardPrompt(request: string, enableExpression?: boolean): string {
  const isTalkingScene = /说话|对话|口播|播报|演讲|主播|数字人|avatar|talking|speech|presenter|host/i.test(request);
  const showExpression = enableExpression ?? isTalkingScene;

  return `你是一位资深视频分镜师兼 AI 表情控制专家。请根据用户的视频创意，生成一份专业的分镜脚本。

用户请求：${request}

${showExpression ? `重要：这个视频包含人物说话/对话场景。请在分镜脚本中包含表情控制指令。

表情控制要求：
- 根据文本中的标点符号（。？！，；…）自动映射到对应的面部动作单元（AU）
- 问号 → 眉毛上抬(AU1+2) + 睁大眼(AU5) + 侧头
- 感叹号 → 咧嘴(AU20) + 睁大眼(AU5) + 后仰回弹
- 逗号 → 轻微挑眉(AU1+2) + 点头
- 句号 → 表情回落 + 眨眼
- 省略号 → 眼神漂移 + 犹豫表情
- 提供 sentiment 情绪权重分析
- 眼神状态（FOCUS/SCAN/RECALL/AVOID/EMPHASIS）跟随标点变化

请在 variants[0] 的 expressionControls 字段中输出完整的标点-AU 映射表。` : ""}

请按以下 JSON 格式严格输出（不要有任何其他内容）：
{
  "scenes": [
    "Scene 1: 镜头描述，包含景别、运镜、画面内容",
    "Scene 2: 镜头描述...",
    "Scene 3: 镜头描述..."
  ],
  "variants": [
    {
      "title": "完整分镜脚本${showExpression ? '（含表情控制）' : ''}",
      "prompt": "将所有场景组合成完整脚本${showExpression ? '，包含人物表情、语气、眼神控制' : ''}",
      "purpose": "完整的视频分镜，${showExpression ? '含 AU 控制指令' : '可直接用于拍摄或 AI 视频生成'}"${showExpression ? `,
      "expressionControls": {
        "punctuationMap": [
          {"punctuation":"，", "auCodes":["AU1+2"], "intensity":0.4, "gazeState":"FOCUS", "duration":200, "easingCurve":"linear"},
          {"punctuation":"。", "auCodes":["AU1+2"], "intensity":0.2, "gazeState":"FOCUS", "duration":300, "easingCurve":"easeInOut"},
          {"punctuation":"？", "auCodes":["AU1+2","AU5"], "intensity":0.8, "gazeState":"EMPHASIS", "duration":500, "easingCurve":"backOut"},
          {"punctuation":"！", "auCodes":["AU20","AU5","AU12"], "intensity":0.9, "gazeState":"EMPHASIS", "duration":600, "easingCurve":"elasticOut"},
          {"punctuation":"…", "auCodes":["AU1+2"], "intensity":0.5, "gazeState":"AVOID", "duration":800, "easingCurve":"sineInOut"},
          {"punctuation":"；", "auCodes":["AU1+2","AU4"], "intensity":0.6, "gazeState":"SCAN", "duration":400, "easingCurve":"easeInOut"}
        ],
        "sentimentWeight": 1.0,
        "noiseSeed": "speaker_001",
        "noiseAmplitude": 0.05,
        "gazeTransitions": [
          {"trigger":"！","targetState":"EMPHASIS","transitionType":"snap"},
          {"trigger":"？","targetState":"FOCUS","transitionType":"snap"},
          {"trigger":"…","targetState":"AVOID","transitionType":"smooth"}
        ],
        "exportFormats": ["json", "csv", "facs-xml", "prompt-text"]
      }` : ""}
    },
    {
      "title": "镜头列表 (Shot List)",
      "prompt": "简化的镜头清单",
      "purpose": "简化的镜头清单，便于现场调度"
    },
    {
      "title": "AI 视频生成提示词",
      "prompt": "适配 AI 视频工具的提示词",
      "parameters": { "motion": "medium", "camera": "smooth" },
      "purpose": "适配 Runway、Pika、可灵等 AI 视频生成工具"
    }
  ]
}`;
}

// ============================================================================
// AI 调用
// ============================================================================

function parseGeneratedPrompts(text: string | null): GeneratedPrompt[] | null {
  if (!text) return null;
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed;
    }
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const parsed = JSON.parse(objMatch[0]);
      if (parsed.variants && Array.isArray(parsed.variants)) return parsed.variants;
    }
  } catch {
    // ignore parse error
  }
  return null;
}

export async function generateMultimodalPromptWithAI(
  request: string,
  mode: MultimodalMode,
  model: string,
  apiKey: string,
  imageData?: string,
  enableExpression?: boolean,
): Promise<MultimodalPromptResult> {
  let systemPrompt = "你是一位专业的多模态提示词工程师。";
  let userPrompt = "";
  let recommendedModel = "";

  switch (mode) {
    case "text-to-image":
      userPrompt = buildTextToImagePrompt(request);
      recommendedModel = "DALL-E 3 / Stable Diffusion XL";
      systemPrompt += "你擅长为图像生成模型（DALL-E、Midjourney、Stable Diffusion）撰写高质量的英文提示词。";
      break;
    case "image-to-text":
      if (imageData) {
        userPrompt = buildImageToTextVisionPrompt(request);
        recommendedModel = "GPT-4V / Claude 3 Vision / Gemini Pro Vision";
        systemPrompt += "你擅长分析图像内容并撰写结构化、精确的图像分析结果。请直接分析用户上传的图片，根据用户的分析需求生成分析结果。";
      } else {
        userPrompt = buildImageToTextPrompt(request);
        recommendedModel = "GPT-4V / Claude 3 Vision / Gemini Pro Vision";
        systemPrompt += "你擅长为视觉语言模型撰写结构化、精确的图像分析提示词。";
      }
      break;
    case "video-storyboard":
      userPrompt = buildVideoStoryboardPrompt(request, enableExpression);
      recommendedModel = "Runway Gen-3 / Pika Labs / Sora";
      systemPrompt += "你擅长为 AI 视频生成工具撰写专业的分镜脚本和镜头描述。";
      break;
  }

  let response: string | null;
  if (mode === "image-to-text" && imageData) {
    response = await callAIVision(model, apiKey, systemPrompt, userPrompt, imageData, 0.7);
  } else {
    response = await callAI(model, apiKey, systemPrompt, userPrompt, 0.7);
  }

  if (response === null) {
    throw new Error("AI 调用失败：模型未返回有效结果，请检查 API Key 和网络连接。");
  }

  const prompts = parseGeneratedPrompts(response);

  if (prompts && prompts.length > 0) {
    return {
      mode,
      originalRequest: request,
      generatedPrompts: prompts,
      tips: getTips(mode),
      recommendedModel,
      usingAI: true,
    };
  }

  throw new Error("AI 返回结果解析失败：无法提取有效的 JSON 数组。请稍后重试。");
}



function getTips(mode: MultimodalMode): string[] {
  switch (mode) {
    case "text-to-image":
      return [
        "使用英文提示词可获得更好的生成效果",
        "Negative prompt 对开源模型效果更明显",
        "适当添加风格关键词可大幅提升一致性",
        "CFG Scale 7-8 是大多数场景的最佳平衡点",
      ];
    case "image-to-text":
      return [
        "上传高清原图可获得更准确的分析",
        "明确指定输出格式（JSON/Markdown/纯文本）",
        "如需 OCR，建议额外指定文字语言",
        "多轮追问可深入挖掘图片细节",
      ];
    case "video-storyboard":
      return [
        "每个镜头建议控制在 3-5 秒",
        "镜头运动描述越具体，AI 生成越稳定",
        "保持角色和场景描述的一致性",
        "先完成静态分镜，再生成动态视频",
      ];
  }
}

/** 获取所有支持的模式 */
export function getMultimodalModes(): { value: MultimodalMode; label: string; description: string }[] {
  return [
    {
      value: "text-to-image",
      label: "文生图",
      description: "生成图像生成模型的优化提示词",
    },
    {
      value: "image-to-text",
      label: "图生文",
      description: "生成图像分析、描述和 OCR 提示词",
    },
    {
      value: "video-storyboard",
      label: "视频分镜",
      description: "生成视频分镜脚本和镜头描述",
    },
  ];
}
