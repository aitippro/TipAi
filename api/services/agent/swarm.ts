/**
 * P3-2: Agent Swarm 多智能体协作引擎
 *
 * 5 种角色 × 3 种协作模式：
 *  - 角色: Planner / Executor / Reviewer / Optimizer / Coordinator
 *  - 模式: Sequential / Parallel / Hierarchical
 *
 * AI 驱动：每个 Agent 调用真实 LLM 执行任务。
 */

import { callAI } from "../../lib/ai-service-v3/client";

export type AgentRole = "planner" | "executor" | "reviewer" | "optimizer" | "coordinator";
export type CollaborationMode = "sequential" | "parallel" | "hierarchical";

export interface Agent {
  id: string;
  role: AgentRole;
  name: string;
  systemPrompt: string;
}

export interface SwarmTask {
  id: string;
  description: string;
  assignedTo: AgentRole;
  input: string;
  output?: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: number;
  completedAt?: number;
}

export interface SwarmResult {
  taskId: string;
  description: string;
  mode: CollaborationMode;
  agents: Agent[];
  tasks: SwarmTask[];
  finalOutput: string;
  executionLog: string[];
  stats: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    totalTimeMs: number;
  };
  usingAI: boolean;
  timedOut?: boolean;
}

// ============================================================================
// 预定义角色
// ============================================================================

export const AGENT_TEMPLATES: Record<AgentRole, { name: string; systemPrompt: string }> = {
  planner: {
    name: "规划者",
    systemPrompt:
      "你是一位任务规划专家。将复杂任务分解为可执行的子任务，明确每个子任务的输入、输出和依赖关系。输出格式：1. 子任务列表 2. 执行顺序 3. 风险点",
  },
  executor: {
    name: "执行者",
    systemPrompt:
      "你是一位高效的任务执行者。根据给定的任务描述，生成高质量的执行结果。注重细节、准确性和完整性。",
  },
  reviewer: {
    name: "审查者",
    systemPrompt:
      "你是一位严格的品质审查专家。审查执行结果，检查：1. 准确性 2. 完整性 3. 一致性 4. 潜在问题。输出审查报告和改进建议。",
  },
  optimizer: {
    name: "优化者",
    systemPrompt:
      "你是一位优化专家。基于审查反馈，优化和改进执行结果。追求更高的质量、效率和可读性。",
  },
  coordinator: {
    name: "协调者",
    systemPrompt:
      "你是一位团队协调专家。整合多个子任务的结果，确保整体一致性，解决冲突，生成最终交付物。",
  },
};

export function createAgent(role: AgentRole, id?: string): Agent {
  const template = AGENT_TEMPLATES[role];
  return {
    id: id || `${role}-${Date.now()}`,
    role,
    name: template.name,
    systemPrompt: template.systemPrompt,
  };
}

// ============================================================================
// Mock 执行引擎（Fallback）
// ============================================================================

function simulateAgentWork(agent: Agent, input: string): { output: string; timeMs: number } {
  const outputs: Record<AgentRole, string> = {
    planner: `📋 规划结果：\n1. 分析需求: "${input.substring(0, 30)}..."\n2. 分解为 3 个子任务\n3. 确定执行顺序和依赖\n4. 识别潜在风险点`,
    executor: `✅ 执行结果：\n基于输入 "${input.substring(0, 30)}..."\n已完成核心任务，生成详细输出。包含所有必要步骤和细节。`,
    reviewer: `🔍 审查报告：\n- 准确性: 通过\n- 完整性: 通过\n- 一致性: 通过\n- 建议: 可进一步优化表达`,
    optimizer: `🚀 优化结果：\n基于审查反馈进行优化：\n1. 精简冗余表述\n2. 增强逻辑连贯性\n3. 提升可读性\n优化后质量提升约 20%`,
    coordinator: `🎯 协调结果：\n整合所有子任务输出：\n- 统一术语和格式\n- 解决冲突点\n- 生成最终交付物\n整体一致性: 优秀`,
  };

  const timeMs = 50 + Math.floor(Math.random() * 250);
  return { output: outputs[agent.role], timeMs };
}

// ============================================================================
// AI 执行引擎
// ============================================================================

async function runAgentWithAI(
  agent: Agent,
  input: string,
  model: string,
  apiKey: string,
  timeoutMs: number = 25000,
): Promise<{ output: string; timeMs: number; timedOut: boolean }> {
  const start = Date.now();
  const deadline = start + timeoutMs;

  // Create a timeout promise
  const timeoutPromise = new Promise<null>((_, reject) => {
    const timer = setTimeout(() => {
      clearTimeout(timer);
      reject(new Error("Agent timeout"));
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      callAI(
        model,
        apiKey,
        agent.systemPrompt,
        `【任务描述】\n${input}\n\n请根据你的角色专长完成上述任务，直接输出结果，不要有多余寒暄。`,
        0.7,
      ),
      timeoutPromise,
    ]);
    const timeMs = Date.now() - start;
    return { output: response || "（AI 无返回）", timeMs, timedOut: false };
  } catch (_e) {
    const timeMs = Date.now() - start;
    return {
      output: `【${agent.name} 执行超时】\n该代理在 ${timeoutMs / 1000} 秒内未能完成，已跳过。可尝试减少角色数量或缩短任务描述后重试。`,
      timeMs,
      timedOut: true,
    };
  }
}

// ============================================================================
// 协作模式实现
// ============================================================================

export async function runSwarm(
  description: string,
  mode: CollaborationMode,
  selectedRoles: AgentRole[],
  model?: string,
  apiKey?: string,
): Promise<SwarmResult> {
  const start = Date.now();
  const taskId = `swarm-${Date.now()}`;
  const agents = selectedRoles.map((role, i) => createAgent(role, `${role}-${i}`));
  const log: string[] = [];
  const usingAI = !!(model && apiKey);
  const globalDeadline = start + 40000; // 40s global timeout

  function isTimedOut(): boolean {
    return Date.now() > globalDeadline;
  }

  function logEntry(msg: string) {
    const ts = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    log.push(`[${ts}] ${msg}`);
  }

  const tasks: SwarmTask[] = [];

  const runAgent = async (agent: Agent, input: string) => {
    if (usingAI) {
      const remaining = globalDeadline - Date.now();
      const agentTimeout = Math.max(5000, Math.min(25000, remaining - 2000));
      return runAgentWithAI(agent, input, model!, apiKey!, agentTimeout);
    }
    return { ...simulateAgentWork(agent, input), timedOut: false };
  };

  if (mode === "sequential") {
    for (const agent of agents) {
      if (isTimedOut()) {
        logEntry(`全局超时，剩余代理已跳过`);
        break;
      }
      const task: SwarmTask = {
        id: `${taskId}-${agent.role}`,
        description: `${agent.name} 执行 ${description}`,
        assignedTo: agent.role,
        input: tasks.length > 0 ? tasks[tasks.length - 1].output || description : description,
        status: "running",
        startedAt: Date.now(),
      };
      tasks.push(task);
      logEntry(`${agent.name} 开始执行...`);

      const result = await runAgent(agent, task.input);
      await new Promise((r) => setTimeout(r, Math.min(result.timeMs, 100)));

      task.output = result.output;
      task.status = result.timedOut ? "failed" : "completed";
      task.completedAt = Date.now();
      logEntry(`${agent.name} ${result.timedOut ? "超时" : "完成"} (${result.timeMs}ms)`);
    }
  } else if (mode === "parallel") {
    const parallelTasks: SwarmTask[] = agents.map((agent) => ({
      id: `${taskId}-${agent.role}`,
      description: `${agent.name} 并行处理 ${description}`,
      assignedTo: agent.role,
      input: description,
      status: "running",
      startedAt: Date.now(),
    }));
    tasks.push(...parallelTasks);

    logEntry(`启动并行执行，${agents.length} 个代理同时工作...`);

    await Promise.all(
      parallelTasks.map(async (task) => {
        if (isTimedOut()) return;
        const agent = agents.find((a) => a.role === task.assignedTo)!;
        const result = await runAgent(agent, task.input);
        await new Promise((r) => setTimeout(r, Math.min(result.timeMs, 100)));
        task.output = result.output;
        task.status = result.timedOut ? "failed" : "completed";
        task.completedAt = Date.now();
        logEntry(`${agent.name} ${result.timedOut ? "超时" : "完成"} (${result.timeMs}ms)`);
      }),
    );
  } else {
    // 层级模式
    const planner = agents.find((a) => a.role === "planner");
    const executors = agents.filter((a) => a.role === "executor");
    const reviewer = agents.find((a) => a.role === "reviewer");
    const optimizer = agents.find((a) => a.role === "optimizer");
    const coordinator = agents.find((a) => a.role === "coordinator");

    if (planner) {
      if (isTimedOut()) { logEntry(`全局超时，跳过规划`); }
      else {
        const task: SwarmTask = {
          id: `${taskId}-plan`,
          description: "规划任务分解",
          assignedTo: "planner",
          input: description,
          status: "running",
          startedAt: Date.now(),
        };
        tasks.push(task);
        logEntry("规划者开始分解任务...");
        const result = await runAgent(planner, description);
        await new Promise((r) => setTimeout(r, Math.min(result.timeMs, 100)));
        task.output = result.output;
        task.status = result.timedOut ? "failed" : "completed";
        task.completedAt = Date.now();
        logEntry(`规划${result.timedOut ? "超时" : "完成"} (${result.timeMs}ms)`);
      }
    }

    if (executors.length > 0) {
      logEntry(`启动 ${executors.length} 个执行者并行工作...`);
      await Promise.all(
        executors.map(async (exec, i) => {
          if (isTimedOut()) return;
          const task: SwarmTask = {
            id: `${taskId}-exec-${i}`,
            description: `执行子任务 ${i + 1}`,
            assignedTo: "executor",
            input: description,
            status: "running",
            startedAt: Date.now(),
          };
          tasks.push(task);
          const result = await runAgent(exec, description);
          await new Promise((r) => setTimeout(r, Math.min(result.timeMs, 100)));
          task.output = result.output;
          task.status = result.timedOut ? "failed" : "completed";
          task.completedAt = Date.now();
          logEntry(`执行者 ${i + 1} ${result.timedOut ? "超时" : "完成"} (${result.timeMs}ms)`);
        }),
      );
    }

    if (reviewer) {
      if (isTimedOut()) { logEntry(`全局超时，跳过审查`); }
      else {
        const task: SwarmTask = {
          id: `${taskId}-review`,
          description: "审查执行结果",
          assignedTo: "reviewer",
          input: tasks.map((t) => t.output || "").join("\n"),
          status: "running",
          startedAt: Date.now(),
        };
        tasks.push(task);
        logEntry("审查者开始审查...");
        const result = await runAgent(reviewer, task.input);
        await new Promise((r) => setTimeout(r, Math.min(result.timeMs, 100)));
        task.output = result.output;
        task.status = result.timedOut ? "failed" : "completed";
        task.completedAt = Date.now();
        logEntry(`审查${result.timedOut ? "超时" : "完成"} (${result.timeMs}ms)`);
      }
    }

    if (optimizer) {
      if (isTimedOut()) { logEntry(`全局超时，跳过优化`); }
      else {
        const task: SwarmTask = {
          id: `${taskId}-optimize`,
          description: "优化执行结果",
          assignedTo: "optimizer",
          input: tasks.map((t) => t.output || "").join("\n"),
          status: "running",
          startedAt: Date.now(),
        };
        tasks.push(task);
        logEntry("优化者开始优化...");
        const result = await runAgent(optimizer, task.input);
        await new Promise((r) => setTimeout(r, Math.min(result.timeMs, 100)));
        task.output = result.output;
        task.status = result.timedOut ? "failed" : "completed";
        task.completedAt = Date.now();
        logEntry(`优化${result.timedOut ? "超时" : "完成"} (${result.timeMs}ms)`);
      }
    }

    if (coordinator) {
      if (isTimedOut()) { logEntry(`全局超时，跳过协调`); }
      else {
        const task: SwarmTask = {
          id: `${taskId}-coordinate`,
          description: "协调生成最终输出",
          assignedTo: "coordinator",
          input: tasks.map((t) => t.output || "").join("\n"),
          status: "running",
          startedAt: Date.now(),
        };
        tasks.push(task);
        logEntry("协调者整合最终结果...");
        const result = await runAgent(coordinator, task.input);
        await new Promise((r) => setTimeout(r, Math.min(result.timeMs, 100)));
        task.output = result.output;
        task.status = result.timedOut ? "failed" : "completed";
        task.completedAt = Date.now();
        logEntry(`协调${result.timedOut ? "超时" : "完成"} (${result.timeMs}ms)`);
      }
    }
  }

  const elapsed = Date.now() - start;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const failed = tasks.filter((t) => t.status === "failed").length;
  const hasTimedOut = isTimedOut();

  if (hasTimedOut) {
    logEntry(`⚠️ 全局超时（${elapsed}ms），已返回部分结果`);
  }

  const coordinatorTask = tasks.find((t) => t.assignedTo === "coordinator" && t.output);
  const lastTask = tasks.filter((t) => t.output).pop();
  const finalOutput = coordinatorTask?.output || lastTask?.output || (hasTimedOut ? "部分代理执行超时，已返回可用结果。建议减少角色数量或缩短任务描述后重试。" : "执行完成");

  return {
    taskId,
    description,
    mode,
    agents,
    tasks,
    finalOutput,
    executionLog: log,
    stats: {
      totalTasks: tasks.length,
      completedTasks: completed,
      failedTasks: failed,
      totalTimeMs: elapsed,
    },
    usingAI,
    timedOut: hasTimedOut,
  };
}

export function getAvailableRoles(): { role: AgentRole; name: string; description: string }[] {
  return [
    { role: "planner", name: "规划者", description: "分解复杂任务，制定执行计划" },
    { role: "executor", name: "执行者", description: "高效执行具体任务" },
    { role: "reviewer", name: "审查者", description: "检查质量和一致性" },
    { role: "optimizer", name: "优化者", description: "基于反馈优化结果" },
    { role: "coordinator", name: "协调者", description: "整合多代理输出" },
  ];
}

export function getCollaborationModes(): { mode: CollaborationMode; name: string; description: string }[] {
  return [
    { mode: "sequential", name: "顺序模式", description: "代理按顺序依次执行，前序输出作为后续输入" },
    { mode: "parallel", name: "并行模式", description: "所有代理同时工作，独立处理不同方面" },
    { mode: "hierarchical", name: "层级模式", description: "规划→执行→审查→优化→协调的流水线" },
  ];
}
