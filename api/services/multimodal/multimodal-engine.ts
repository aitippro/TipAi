/**
 * P1-1: 多模态提示词引擎
 *
 * 支持三种多模态场景：
 *  - 文生图 (text-to-image): 生成 Stable Diffusion / DALL-E 优化提示词
 *  - 图生文 (image-to-text): 生成图像分析、描述、OCR 等提示词
 *  - 视频分镜 (video-storyboard): 生成视频分镜脚本和镜头描述
 */

export type MultimodalMode = "text-to-image" | "image-to-text" | "video-storyboard";

export interface MultimodalPromptResult {
  mode: MultimodalMode;
  originalRequest: string;
  generatedPrompts: GeneratedPrompt[];
  tips: string[];
  recommendedModel: string;
}

export interface GeneratedPrompt {
  title: string;
  prompt: string;
  negativePrompt?: string;
  parameters?: Record<string, string | number>;
  purpose: string;
}

// ============================================================================
// 文生图: Text-to-Image
// ============================================================================

function generateTextToImagePrompts(request: string): GeneratedPrompt[] {
  const base = request.trim();

  return [
    {
      title: "标准版 (DALL-E 3)",
      prompt: enhanceImagePrompt(base, "standard"),
      purpose: "适合 DALL-E 3、Midjourney 等现代模型",
      parameters: { quality: "hd", style: "vivid" },
    },
    {
      title: "细节增强版 (Stable Diffusion)",
      prompt: enhanceImagePrompt(base, "detailed"),
      negativePrompt: "blurry, low quality, distorted, deformed, ugly, bad anatomy",
      purpose: "适合 Stable Diffusion、ComfyUI 等开源模型",
      parameters: { steps: 30, cfg: 7.5, sampler: "DPM++ 2M Karras" },
    },
    {
      title: "极简版 (快速迭代)",
      prompt: enhanceImagePrompt(base, "minimal"),
      purpose: "快速验证概念，减少 token 消耗",
      parameters: { quality: "standard", style: "natural" },
    },
  ];
}

function enhanceImagePrompt(request: string, style: "standard" | "detailed" | "minimal"): string {
  if (style === "minimal") return request;

  const qualityTags =
    style === "detailed"
      ? ", highly detailed, 8k uhd, masterpiece, best quality, sharp focus, professional photography"
      : ", high quality, detailed, well-lit";

  const styleTags = detectStyle(request);

  return `${request}${qualityTags}${styleTags ? ", " + styleTags : ""}`;
}

function detectStyle(request: string): string {
  const lower = request.toLowerCase();
  if (/动漫|anime|manga|二次元/i.test(lower)) return "anime style, studio ghibli";
  if (/写实|photo|realistic/i.test(lower)) return "photorealistic, cinematic lighting";
  if (/油画|oil painting/i.test(lower)) return "oil painting, renaissance style";
  if (/水彩|watercolor/i.test(lower)) return "watercolor painting, soft colors";
  if (/像素|pixel/i.test(lower)) return "pixel art, retro game style";
  if (/赛博朋克|cyberpunk/i.test(lower)) return "cyberpunk, neon lights, futuristic";
  return "";
}

// ============================================================================
// 图生文: Image-to-Text
// ============================================================================

function generateImageToTextPrompts(request: string): GeneratedPrompt[] {
  return [
    {
      title: "详细描述",
      prompt: `请详细描述这张图片。包括：\n1. 主体内容和场景\n2. 色彩、光线、构图\n3. 情感和氛围\n4. 任何文字或标志\n\n用户意图：${request}`,
      purpose: "生成全面的图像描述",
    },
    {
      title: "结构化分析",
      prompt: `请对这张图片进行结构化分析，以 JSON 格式输出：\n{\n  "subject": "主体",\n  "setting": "场景环境",\n  "colors": ["主要颜色"],\n  "mood": "情感氛围",\n  "composition": "构图特点",\n  "text_elements": ["图中文字"],\n  "action": "动作或事件"\n}\n\n用户意图：${request}`,
      purpose: "便于程序化处理的结构化输出",
    },
    {
      title: "创意解读",
      prompt: `请以创意写作的角度解读这张图片：\n1. 写一个短故事开头（100字以内）\n2. 提出3个可能的标题\n3. 分析图片的象征意义\n\n用户意图：${request}`,
      purpose: "激发创意灵感",
    },
  ];
}

// ============================================================================
// 视频分镜: Video Storyboard
// ============================================================================

function generateVideoStoryboard(request: string): GeneratedPrompt[] {
  const scenes = generateScenes(request);

  return [
    {
      title: "完整分镜脚本",
      prompt: scenes.join("\n\n"),
      purpose: "完整的视频分镜，可直接用于拍摄或 AI 视频生成",
    },
    {
      title: "镜头列表 (Shot List)",
      prompt: scenes
        .map((s, i) => `SHOT ${String(i + 1).padStart(2, "0")}: ${s.split("\n")[0]}`)
        .join("\n"),
      purpose: "简化的镜头清单，便于现场调度",
    },
    {
      title: "AI 视频生成提示词",
      prompt: scenes
        .map((s, i) => `Scene ${i + 1}: ${s.replace(/.*?: /, "").split("\n")[0]}`)
        .join("\n"),
      purpose: "适配 Runway、Pika 等 AI 视频生成工具",
      parameters: { motion: "medium", camera: "smooth" },
    },
  ];
}

function generateScenes(request: string): string[] {
  const base = request.trim();
  // 基于内容推断分镜数量
  const sceneCount = Math.min(8, Math.max(3, Math.floor(base.length / 20)));

  const templates = [
    `镜头1 - 广角 establishing shot: 展示${base}的整体场景，慢推近。`,
    `镜头2 - 中景: 主体进入画面，展示关键动作或表情。`,
    `镜头3 - 特写: 强调重要细节或情感瞬间。`,
    `镜头4 - 过肩镜头: 建立人物关系或对话场景。`,
    `镜头5 - 运动镜头: 跟随主体移动，增加动感。`,
    `镜头6 - 俯拍/仰拍: 改变视角，提供新的视觉信息。`,
    `镜头7 - 反应镜头: 捕捉观众或配角的反应。`,
    `镜头8 - 收尾镜头: 广角或空镜头，暗示结局或过渡。`,
  ];

  return templates.slice(0, sceneCount).map((t, i) => {
    // 个性化每个镜头
    if (i === 0) return t.replace("展示", `展示"${base}"的`);
    return t;
  });
}

// ============================================================================
// 主入口
// ============================================================================

export function generateMultimodalPrompt(
  request: string,
  mode: MultimodalMode,
): MultimodalPromptResult {
  let prompts: GeneratedPrompt[];
  let recommendedModel: string;
  let tips: string[];

  switch (mode) {
    case "text-to-image":
      prompts = generateTextToImagePrompts(request);
      recommendedModel = "DALL-E 3 / Stable Diffusion XL";
      tips = [
        "使用英文提示词可获得更好的生成效果",
        "Negative prompt 对开源模型效果更明显",
        "适当添加风格关键词可大幅提升一致性",
        "CFG Scale 7-8 是大多数场景的最佳平衡点",
      ];
      break;

    case "image-to-text":
      prompts = generateImageToTextPrompts(request);
      recommendedModel = "GPT-4V / Claude 3 Vision / Gemini Pro Vision";
      tips = [
        "上传高清原图可获得更准确的分析",
        "明确指定输出格式（JSON/Markdown/纯文本）",
        "如需 OCR，建议额外指定文字语言",
        "多轮追问可深入挖掘图片细节",
      ];
      break;

    case "video-storyboard":
      prompts = generateVideoStoryboard(request);
      recommendedModel = "Runway Gen-3 / Pika Labs / Sora";
      tips = [
        "每个镜头建议控制在 3-5 秒",
        "镜头运动描述越具体，AI 生成越稳定",
        "保持角色和场景描述的一致性",
        "先完成静态分镜，再生成动态视频",
      ];
      break;
  }

  return {
    mode,
    originalRequest: request,
    generatedPrompts: prompts,
    tips,
    recommendedModel,
  };
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
