export type SubTopic = {
  id: string;
  title: string;
  pdfUrl: string;
};

export type Topic = {
  id: string;
  title: string;
  subtopics: SubTopic[];
};

export type LearnCategory = {
  id: string;
  name: string;
  icon: string;
  topics: Topic[];
};

// Replace these URLs with real PDF assets from your R2/S3 bucket
const DEMO_PDF = "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf";

const sub = (id: string, title: string): SubTopic => ({ id, title, pdfUrl: DEMO_PDF });

export const LEARN_CATEGORIES: LearnCategory[] = [
  {
    id: "ai-content",
    name: "AI Content Creator",
    icon: "✍️",
    topics: [
      {
        id: "intro",
        title: "Introduction to AI Content Creation",
        subtopics: [
          sub("what-is-ai-content", "What is AI-Assisted Content?"),
          sub("ai-tools-landscape", "The AI Tools Landscape"),
        ],
      },
      {
        id: "prompting",
        title: "Mastering Prompt Engineering",
        subtopics: [
          sub("basic-prompts", "Basic Prompt Structure"),
          sub("advanced-prompts", "Advanced Prompting Techniques"),
        ],
      },
      {
        id: "strategy",
        title: "Content Strategy with AI",
        subtopics: [
          sub("content-planning", "Planning a Content Calendar"),
          sub("niche-research", "Niche & Audience Research with AI"),
        ],
      },
      {
        id: "seo",
        title: "SEO & AI-Optimised Writing",
        subtopics: [
          sub("seo-fundamentals", "SEO Fundamentals"),
          sub("ai-seo-tools", "Using AI for Keyword Research"),
        ],
      },
      {
        id: "monetise",
        title: "Monetising Your AI Content",
        subtopics: [
          sub("income-streams", "Content Income Streams"),
          sub("client-acquisition", "Acquiring & Retaining Clients"),
        ],
      },
    ],
  },
  {
    id: "data-analyst",
    name: "AI Data Analyst",
    icon: "📊",
    topics: [
      {
        id: "foundations",
        title: "Foundations of Data Analysis",
        subtopics: [
          sub("data-types", "Data Types & Sources"),
          sub("stats-basics", "Statistics Fundamentals"),
        ],
      },
      {
        id: "visualisation",
        title: "AI-Powered Data Visualisation",
        subtopics: [
          sub("chart-selection", "Choosing the Right Chart"),
          sub("ai-viz-tools", "AI Visualisation Tools"),
        ],
      },
      {
        id: "ml-basics",
        title: "Machine Learning for Analysts",
        subtopics: [
          sub("supervised-ml", "Supervised Learning Concepts"),
          sub("model-evaluation", "Evaluating ML Models"),
        ],
      },
      {
        id: "big-data",
        title: "Working with Large Datasets",
        subtopics: [
          sub("data-cleaning", "Data Cleaning & Wrangling"),
          sub("cloud-data", "Cloud-Based Data Pipelines"),
        ],
      },
      {
        id: "reporting",
        title: "Presenting Insights & Reports",
        subtopics: [
          sub("storytelling", "Data Storytelling"),
          sub("dashboard-design", "Dashboard Design Principles"),
        ],
      },
    ],
  },
  {
    id: "developer",
    name: "AI Developer",
    icon: "💻",
    topics: [
      {
        id: "ai-dev-fundamentals",
        title: "AI Development Fundamentals",
        subtopics: [
          sub("llm-concepts", "LLMs & Transformer Architecture"),
          sub("api-overview", "AI API Ecosystem Overview"),
        ],
      },
      {
        id: "api-integration",
        title: "Building with OpenAI & Gemini APIs",
        subtopics: [
          sub("openai-api", "OpenAI API Deep Dive"),
          sub("gemini-api", "Gemini & Multimodal APIs"),
        ],
      },
      {
        id: "fine-tuning",
        title: "Fine-tuning & Advanced Prompting",
        subtopics: [
          sub("fine-tune-basics", "Fine-tuning Fundamentals"),
          sub("rag-pattern", "Retrieval Augmented Generation (RAG)"),
        ],
      },
      {
        id: "deployment",
        title: "Deploying AI Applications",
        subtopics: [
          sub("serverless-ai", "Serverless AI Deployments"),
          sub("scaling-ai", "Scaling & Cost Optimisation"),
        ],
      },
      {
        id: "security",
        title: "AI Security & Ethics",
        subtopics: [
          sub("prompt-injection", "Prompt Injection & Defence"),
          sub("ai-ethics", "Responsible AI Principles"),
        ],
      },
    ],
  },
  {
    id: "marketer",
    name: "Digital Marketer",
    icon: "📱",
    topics: [
      {
        id: "digital-foundations",
        title: "Digital Marketing Foundations",
        subtopics: [
          sub("funnel-basics", "The Marketing Funnel"),
          sub("buyer-persona", "Building Buyer Personas"),
        ],
      },
      {
        id: "ai-campaigns",
        title: "AI-Powered Campaign Management",
        subtopics: [
          sub("ad-copy-ai", "Writing Ad Copy with AI"),
          sub("audience-targeting", "AI Audience Targeting"),
        ],
      },
      {
        id: "social-automation",
        title: "Social Media Automation",
        subtopics: [
          sub("scheduling-tools", "AI Scheduling & Posting Tools"),
          sub("engagement-ai", "Automated Engagement Strategies"),
        ],
      },
      {
        id: "analytics",
        title: "Analytics & Performance Tracking",
        subtopics: [
          sub("kpi-metrics", "Key Marketing Metrics"),
          sub("attribution", "Attribution Modelling"),
        ],
      },
      {
        id: "conversion",
        title: "Conversion Rate Optimisation",
        subtopics: [
          sub("landing-pages", "Landing Page Best Practices"),
          sub("ab-testing", "A/B Testing with AI Tools"),
        ],
      },
    ],
  },
  {
    id: "tutor",
    name: "AI Tutor",
    icon: "🎓",
    topics: [
      {
        id: "teaching-principles",
        title: "Principles of AI-Assisted Teaching",
        subtopics: [
          sub("learning-styles", "Learning Styles & AI Adaptation"),
          sub("ai-pedagogy", "Pedagogical Frameworks for AI"),
        ],
      },
      {
        id: "course-creation",
        title: "Creating Course Content with AI",
        subtopics: [
          sub("curriculum-design", "AI-Aided Curriculum Design"),
          sub("multimedia-content", "Generating Multimedia Materials"),
        ],
      },
      {
        id: "engagement",
        title: "Student Engagement Strategies",
        subtopics: [
          sub("gamification", "Gamification & Incentives"),
          sub("live-sessions", "Live AI-Enhanced Sessions"),
        ],
      },
      {
        id: "assessment",
        title: "Assessment & Certification Design",
        subtopics: [
          sub("quiz-design", "Designing Effective Quizzes"),
          sub("auto-grading", "Automated Grading Systems"),
        ],
      },
      {
        id: "tutor-business",
        title: "Building Your Tutoring Business",
        subtopics: [
          sub("platform-choice", "Choosing Your Tutoring Platform"),
          sub("pricing-packages", "Pricing & Packaging Your Services"),
        ],
      },
    ],
  },
  {
    id: "video-editor",
    name: "AI Video Editor",
    icon: "🎬",
    topics: [
      {
        id: "ai-video-intro",
        title: "Introduction to AI Video Tools",
        subtopics: [
          sub("tools-survey", "AI Video Tool Survey"),
          sub("workflow-setup", "Setting Up Your AI Workflow"),
        ],
      },
      {
        id: "automated-editing",
        title: "Automated Editing Techniques",
        subtopics: [
          sub("auto-cut", "Auto-Cut & Scene Detection"),
          sub("captions-ai", "AI-Generated Captions & Subtitles"),
        ],
      },
      {
        id: "ai-assets",
        title: "AI-Generated B-Roll & Assets",
        subtopics: [
          sub("text-to-video", "Text-to-Video Generation"),
          sub("stock-ai", "AI Stock & Asset Libraries"),
        ],
      },
      {
        id: "color-grading",
        title: "Color Grading with AI Assistance",
        subtopics: [
          sub("lut-ai", "AI LUTs & Color Matching"),
          sub("correction-workflow", "Automated Color Correction"),
        ],
      },
      {
        id: "publishing",
        title: "Publishing & Monetisation",
        subtopics: [
          sub("platform-optimisation", "Platform-Specific Optimisation"),
          sub("revenue-models", "Video Revenue Models"),
        ],
      },
    ],
  },
  {
    id: "crypto",
    name: "Crypto & DeFi Analyst",
    icon: "₿",
    topics: [
      {
        id: "blockchain-basics",
        title: "Blockchain & Crypto Fundamentals",
        subtopics: [
          sub("blockchain-101", "How Blockchain Works"),
          sub("crypto-wallets", "Wallets, Keys & Security"),
        ],
      },
      {
        id: "defi-protocols",
        title: "DeFi Protocols & Yield Strategies",
        subtopics: [
          sub("amm-dex", "AMMs & Decentralised Exchanges"),
          sub("yield-farming", "Yield Farming & Liquidity Mining"),
        ],
      },
      {
        id: "technical-analysis",
        title: "Technical Analysis & Charting",
        subtopics: [
          sub("candlestick-patterns", "Candlestick & Chart Patterns"),
          sub("indicators-ai", "AI-Enhanced Indicators"),
        ],
      },
      {
        id: "risk-management",
        title: "Risk Management in Crypto",
        subtopics: [
          sub("position-sizing", "Position Sizing & Stop-Loss"),
          sub("portfolio-hedging", "Portfolio Hedging Strategies"),
        ],
      },
      {
        id: "portfolio-building",
        title: "Building a Crypto Portfolio",
        subtopics: [
          sub("asset-allocation", "Asset Allocation Models"),
          sub("rebalancing", "Rebalancing & Exit Strategies"),
        ],
      },
    ],
  },
];
