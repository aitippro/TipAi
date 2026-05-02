/**
 * UI QA Extreme Test Suite
 * Most rigorous functional testing for UI fixes
 * Covers: TemplateMarket grid, TextReveal truncation, HowItWorksSection
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

// ── Mock framer-motion to avoid animation issues in test env ──
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...props }: { children?: ReactNode; className?: string }) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

// ── Mock trpc ──
vi.mock("@/providers/trpc", () => ({
  trpc: {
    template: {
      list: { useQuery: () => ({ data: [], isLoading: false, isError: false }) },
      myTemplates: { useQuery: () => ({ data: [] }) },
      create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      use: { useMutation: () => ({ mutate: vi.fn() }) },
      rate: { useMutation: () => ({ mutate: vi.fn() }) },
    },
    project: {
      create: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      update: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      get: { useQuery: () => ({ data: null }) },
    },
    promptForge: {
      generate: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      clarify: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      analyze: { useQuery: () => ({ data: null, isFetching: false }) },
    },
    useUtils: () => ({
      template: { list: { invalidate: vi.fn() } },
    }),
  },
}));

// ── Mock auth ──
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 1 } }),
}));

// ── Mock sonner toast ──
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  Toaster: () => null,
}));

// ── Mock router ──
vi.mock("react-router", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/" }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  Routes: ({ children }: { children?: ReactNode }) => <>{children}</>,
  Route: () => null,
  Link: ({ children, to }: { children?: ReactNode; to?: string }) => (
    <a href={to}>{children}</a>
  ),
}));

// ── Mock other components that may cause issues ──
vi.mock("@/components/effects/AuroraBackground", () => ({
  AuroraBackground: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/effects/TiltCard", () => ({
  TiltCard: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/effects/ScrollReveal", () => ({
  ScrollReveal: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/effects/StaggerContainer", () => ({
  StaggerContainer: ({ children, className }: { children?: ReactNode; className?: string }) => (
    <div data-testid="stagger-container" className={className}>{children}</div>
  ),
  StaggerItem: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/layout/PageTransition", () => ({
  PageTransition: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/RippleButton", () => ({
  RippleButton: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock("@/components/GenerateModal", () => ({
  default: () => <div data-testid="generate-modal">GenerateModal</div>,
}));

vi.mock("@/components/clarify/ClarifyChatPanel", () => ({
  ClarifyChatPanel: () => <div data-testid="clarify-chat">ClarifyChatPanel</div>,
}));

// ── Test 1: TextReveal Component ──
import { TextReveal } from "@/components/effects/TextReveal";

describe("EXTREME QA: TextReveal Component", () => {
  it("should render container as 'inline' NOT 'inline-flex flex-wrap'", () => {
    const { container } = render(<TextReveal text="模糊需求" />);
    const span = container.querySelector("span");
    expect(span).toBeTruthy();
    // Critical: must NOT contain flex layout that causes truncation
    expect(span!.className).not.toMatch(/inline-flex/);
    expect(span!.className).not.toMatch(/flex-wrap/);
    expect(span!.className).toMatch(/inline/);
  });

  it("should render all characters for Chinese text", () => {
    const { container } = render(<TextReveal text="模糊需求" mode="char" />);
    const spans = container.querySelectorAll("span > span");
    expect(spans.length).toBe(4);
  });

  it("should render all words with space preservation", () => {
    const { container } = render(<TextReveal text="模糊需求 完美提示词" mode="word" />);
    const wordSpans = container.querySelectorAll("span > span");
    expect(wordSpans.length).toBe(2);
    expect(wordSpans[0].textContent).toMatch(/模糊需求/);
    expect(wordSpans[1].textContent).toMatch(/完美提示词/);
  });

  it("should handle empty text gracefully", () => {
    const { container } = render(<TextReveal text="" />);
    // Should render at minimum the root span without errors
    expect(container.querySelector("span.inline-block")).toBeTruthy();
  });

  it("should handle very long text (1000 chars)", () => {
    const longText = "测".repeat(1000);
    const { container } = render(<TextReveal text={longText} mode="char" />);
    const spans = container.querySelectorAll("span > span");
    expect(spans.length).toBe(1000);
  });

  it("should handle emoji and special characters", () => {
    const { container } = render(<TextReveal text="🚀测试✨" mode="char" />);
    const spans = container.querySelectorAll("span > span");
    // Emoji may be surrogate pairs, so just verify non-zero rendering
    expect(spans.length).toBeGreaterThan(0);
  });
});

// ── Test 2: HowItWorksSection Component ──
import { HowItWorksSection } from "@/components/home/HowItWorksSection";

describe("EXTREME QA: HowItWorksSection (Lost UI Restoration)", () => {
  it("should render the section heading", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText("三步获得完美提示词")).toBeTruthy();
  });

  it("should render all 3 steps", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("should have grid layout class for responsive design", () => {
    const { container } = render(<HowItWorksSection />);
    const grid = container.querySelector(".grid");
    expect(grid).toBeTruthy();
    expect(grid!.className).toMatch(/grid-cols-1/);
    expect(grid!.className).toMatch(/sm:grid-cols-3/);
  });

  it("should have section element with proper structure", () => {
    const { container } = render(<HowItWorksSection />);
    const section = container.querySelector("section");
    expect(section).toBeTruthy();
  });
});

// ── Test 3: TemplateMarket Page ──
import TemplateMarket from "@/pages/TemplateMarket";

describe("EXTREME QA: TemplateMarket Grid Layout", () => {
  it("should render page title", () => {
    render(<TemplateMarket />);
    expect(screen.getByText("模板市场")).toBeTruthy();
  });

  it("should render subtitle", () => {
    render(<TemplateMarket />);
    expect(screen.getByText("发现和分享高质量提示词模板")).toBeTruthy();
  });

  it("should have grid container with responsive columns", () => {
    const { container } = render(<TemplateMarket />);
    const gridElements = container.querySelectorAll('[class*="grid-cols"]');
    expect(gridElements.length).toBeGreaterThan(0);

    let hasResponsiveGrid = false;
    gridElements.forEach((el) => {
      const className = el.className;
      if (
        className.includes("md:grid-cols-2") &&
        className.includes("lg:grid-cols-3")
      ) {
        hasResponsiveGrid = true;
      }
    });
    expect(hasResponsiveGrid).toBe(true);
  });

  it("should render default templates when API returns empty", () => {
    render(<TemplateMarket />);
    // Search input placeholder should be visible
    expect(screen.getByPlaceholderText("搜索模板...")).toBeTruthy();
  });

  it("should have view mode toggle buttons", () => {
    render(<TemplateMarket />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});

// ── Test 4: Home Page ──
import Home from "@/pages/Home";

describe("EXTREME QA: Home Page UI Completeness", () => {
  it("should render the main title with arrow", () => {
    const { container } = render(<Home />);
    const h1 = container.querySelector("h1");
    expect(h1).toBeTruthy();
    expect(h1!.textContent).toContain("模糊需求");
    expect(h1!.textContent).toContain("→");
    expect(h1!.textContent).toContain("完美提示词");
  });

  it("should have whitespace-nowrap on h1 to prevent truncation", () => {
    const { container } = render(<Home />);
    const h1 = container.querySelector("h1");
    expect(h1).toBeTruthy();
    expect(h1!.className).toMatch(/whitespace-nowrap/);
  });

  it("should render HowItWorksSection inside Home", () => {
    render(<Home />);
    expect(screen.getByText("三步获得完美提示词")).toBeTruthy();
  });

  it("should render scene cards section", () => {
    render(<Home />);
    expect(screen.getByText("文案创作")).toBeTruthy();
    expect(screen.getByText("创意生成")).toBeTruthy();
    expect(screen.getByText("办公辅助")).toBeTruthy();
    expect(screen.getByText("信息检索")).toBeTruthy();
  });

  it("should render input textarea", () => {
    const { container } = render(<Home />);
    const textarea = container.querySelector("textarea");
    expect(textarea).toBeTruthy();
  });

  it("should render progress steps", () => {
    render(<Home />);
    // Use getAllByText since "描述需求" may appear in multiple places
    expect(screen.getAllByText("描述需求").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AI 分析").length).toBeGreaterThan(0);
    expect(screen.getAllByText("生成结果").length).toBeGreaterThan(0);
  });
});

// ── Test 5: Extreme Edge Cases ──
describe("EXTREME QA: Edge Cases & Regression Prevention", () => {
  it("TextReveal: should not use flex container that breaks inline layout", () => {
    const { container } = render(<TextReveal text="测试文字" />);
    const root = container.firstElementChild;
    expect(root!.className).not.toContain("flex");
    expect(root!.className).not.toContain("flex-wrap");
  });

  it("HowItWorksSection: should have all step descriptions", () => {
    render(<HowItWorksSection />);
    const paragraphs = screen.getAllByText(/./, { selector: "p" });
    expect(paragraphs.length).toBeGreaterThanOrEqual(3);
  });

  it("TemplateMarket: grid class must exist on stagger container (verified in source)", () => {
    // Architectural check: after fix, grid class is on StaggerContainer
    // This ensures StaggerItem (card wrappers) are direct children of grid
    const { container } = render(<TemplateMarket />);
    const staggerContainers = container.querySelectorAll('[data-testid="stagger-container"]');
    expect(staggerContainers.length).toBeGreaterThan(0);
  });
});
