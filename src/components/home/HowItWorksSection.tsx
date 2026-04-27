import { HOW_IT_WORKS_STEPS } from "./config"

export function HowItWorksSection() {
  return (
    <section className="py-20">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-semibold text-slate-900 mb-3">三步获得完美提示词</h2>
          <p className="text-base text-slate-400 font-light">AI 自动完成复杂的提示词工程，你只需描述需求</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {HOW_IT_WORKS_STEPS.map((item, index) => (
            <div key={item.title} className="text-center group">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-500 shadow-sm`}>
                <item.icon className="w-7 h-7 text-slate-700" />
              </div>
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                <h3 className="font-semibold text-slate-800">{item.title}</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
