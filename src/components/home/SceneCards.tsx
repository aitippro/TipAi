import { Film, FileText, Code, Image } from "lucide-react";

interface SceneCard {
  icon: typeof Film;
  label: string;
  description: string;
  template: string;
  color: string;
}

const SCENES: SceneCard[] = [
  {
    icon: Film,
    label: "视频脚本",
    description: "短视频、广告、教程脚本",
    template: "为一个关于{主题}的短视频创作脚本，包含开场、主体和结尾，时长约{分钟}分钟。",
    color: "text-rose-500 bg-rose-50",
  },
  {
    icon: FileText,
    label: "内容文案",
    description: "小红书、公众号、邮件",
    template: "为一篇关于{主题}的小红书/公众号文章创作文案，风格亲切自然，包含标题和正文。",
    color: "text-violet-500 bg-violet-50",
  },
  {
    icon: Code,
    label: "开发代码",
    description: "React、API、SQL",
    template: "使用{技术栈}实现一个{功能描述}，代码结构清晰，包含必要的注释和错误处理。",
    color: "text-emerald-500 bg-emerald-50",
  },
  {
    icon: Image,
    label: "图像生成",
    description: "文生图、风格迁移",
    template: "生成一张{风格}风格的图像：{描述}，构图{描述}，光线{描述}。",
    color: "text-amber-500 bg-amber-50",
  },
];

interface Props {
  onSelect: (template: string) => void;
}

export function SceneCards({ onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {SCENES.map((scene) => {
        const Icon = scene.icon;
        return (
          <button
            key={scene.label}
            onClick={() => onSelect(scene.template)}
            className="group p-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-250 ease-apple text-left"
          >
            <div className={`w-9 h-9 rounded-xl ${scene.color} flex items-center justify-center mb-3`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-sm font-medium text-slate-800">{scene.label}</p>
            <p className="text-xs text-slate-400 mt-1">{scene.description}</p>
          </button>
        );
      })}
    </div>
  );
}
