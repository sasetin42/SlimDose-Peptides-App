export type LandingDictionary = {
  nav: {
    benefits: string;
    features: string;
    workflows: string;
    testimonials: string;
    sponsored: string;
    contribute: string;
    faq: string;
    docs: string;
  };
  hero: {
    title: string;
    subtitle: string;
    getStarted: string;
    github: string;
  };
  stack: {
    title: string;
    items: [string, string, string, string, string, string];
  };
  benefits: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: { title: string; description: string }[];
  };
  features: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: { title: string; description: string }[];
  };
  workflows: {
    eyebrow: string;
    title: string;
    subtitle: string;
    core: string;
    browseAll: string;
    items: { title: string; description: string; highlight?: boolean }[];
  };
  testimonials: {
    title: string;
    subtitle: string;
    items: {
      name: string;
      role: string;
      comment: string;
      clamp: string;
      className?: string;
    }[];
  };
  sponsored: {
    eyebrow: string;
    title: string;
    subtitle: string;
    platinum: string;
    unikornBlurb: string;
    visitSponsor: string;
    becomeTitle: string;
    becomeDesc: string;
    talk: string;
    coffee: string;
    wantBrand: string;
    reachOut: string;
  };
  contribute: {
    eyebrow: string;
    title: string;
    subtitle: string;
    starLabel: string;
    guide: string;
    loading: string;
    empty: string;
    commits: string;
    viewAll: string;
  };
  faq: {
    eyebrow: string;
    title: string;
    items: { value: string; question: string; answer: string }[];
  };
  footer: {
    blurb: string;
    product: string;
    resources: string;
    community: string;
    legal: string;
    documentation: string;
    agents: string;
    skills: string;
    workflows: string;
    installation: string;
    cli: string;
    changelog: string;
    github: string;
    issues: string;
    discussions: string;
    license: string;
    security: string;
    credit: string;
  };
};

export const landingEn: LandingDictionary = {
  nav: {
    benefits: "Benefits",
    features: "Features",
    workflows: "Workflows",
    testimonials: "Testimonials",
    sponsored: "Sponsored",
    contribute: "Contribute",
    faq: "FAQ",
    docs: "Docs",
  },
  hero: {
    title: "Expand your AI coding agents with",
    subtitle:
      "47 skills, 20 specialist agents, and production workflows you can install in one command. Safe merge updates keep your local changes.",
    getStarted: "Get started",
    github: "GitHub",
  },
  stack: {
    title: "Everything in one toolkit",
    items: [
      "20 Agents",
      "47 Skills",
      "13 Workflows",
      "CLI",
      "Merge-safe",
      "Open source",
    ],
  },
  benefits: {
    eyebrow: "Benefits",
    title: "Your shortcut to production-ready agent work",
    subtitle:
      "AG Kit packages the playbooks, agents, and guardrails you need so AI coding assistants act like a coordinated team instead of a single chat window.",
    items: [
      {
        title: "Ship features faster",
        description:
          "Specialist agents and skills cover planning, coding, review, security, and deploy so you spend less time reinventing prompts.",
      },
      {
        title: "Safer updates",
        description:
          "Managed-file manifests, three-way conflict detection, and backups mean ag-kit update never silently wipes your local edits.",
      },
      {
        title: "Workflows that stick",
        description:
          "From /brainstorm to /deploy, repeatable command workflows keep teams aligned on the same process.",
      },
      {
        title: "Quality built in",
        description:
          "Lint, security, SEO, performance, and test checkers live next to the skills that teach agents how to use them.",
      },
    ],
  },
  features: {
    eyebrow: "Features",
    title: "What makes AG Kit different",
    subtitle:
      "A full agent capability pack, not a single prompt template - designed for real projects and safe upgrades over time.",
    items: [
      {
        title: "Specialist agents",
        description:
          "Frontend, backend, security, database, mobile, and more - each with a focused system prompt and skill set.",
      },
      {
        title: "Domain skills",
        description:
          "47 skills covering architecture, testing, i18n, SEO, GEO, deployment, and clean code standards.",
      },
      {
        title: "Guided workflows",
        description:
          "Slash commands for brainstorm, plan, create, debug, test, preview, status, orchestrate, and deploy.",
      },
      {
        title: "Simple CLI",
        description:
          "init, update, rollback, and status with dry-run, merge/replace strategies, and conflict reports.",
      },
      {
        title: "Merge-aware updates",
        description:
          "SHA-256 baselines detect clean files, local edits, and true three-way conflicts before writing.",
      },
      {
        title: "Docs that match the kit",
        description:
          "Installation guides, CLI reference, and localized examples stay in sync with the toolkit version.",
      },
    ],
  },
  workflows: {
    eyebrow: "Workflows",
    title: "Commands that run your process",
    subtitle: "Slash workflows turn tribal knowledge into repeatable agent sessions.",
    core: "Core",
    browseAll: "Browse all workflows",
    items: [
      {
        title: "/brainstorm",
        description:
          "Explore multiple approaches with pros, cons, and tradeoffs before writing code.",
      },
      {
        title: "/plan",
        description:
          "Break features into tasks, dependencies, and verification criteria.",
      },
      {
        title: "/create",
        description: "Scaffold full-stack apps from a natural-language request.",
      },
      {
        title: "/debug",
        description: "Systematic root-cause analysis with evidence-based fixes.",
      },
      {
        title: "/orchestrate",
        description:
          "Coordinate parallel specialist agents on complex multi-domain work.",
      },
      {
        title: "/deploy",
        description:
          "Production-minded release steps with rollback thinking built in.",
        highlight: true,
      },
    ],
  },
  testimonials: {
    title: "Testimonials",
    subtitle:
      "Hear from teams using AG Kit to ship agent skills, workflows, and safer updates.",
    items: [
      {
        name: "Sarah Chen",
        role: "Staff Engineer",
        comment:
          "Merge-safe update is the difference. We keep local skill tweaks and still pull upstream agents without rewriting the tree by hand. Shipping agent capability packs finally feels safe.",
        clamp: "line-clamp-3",
      },
      {
        name: "Marcus Rodriguez",
        role: "Platform Lead",
        comment:
          "The /brainstorm and /plan workflows gave our team a shared process instead of every agent session inventing its own steps. Our review scores improved after we wired the built-in checkers into every PR workflow.",
        clamp: "line-clamp-5",
      },
      {
        name: "Emily Watson",
        role: "Head of Product",
        comment:
          "Finally, a toolkit that developers actually want to use. Clear docs, flexible skills, and sensible defaults.",
        clamp: "line-clamp-2",
        className: "hidden lg:block",
      },
      {
        name: "David Kim",
        role: "Tech Lead",
        comment:
          "We evaluated several agent packs before settling on AG Kit. What set it apart was merge-aware updates and production-ready workflows. Every skill felt usable out of the box.",
        clamp: "line-clamp-4",
      },
      {
        name: "Rachel Foster",
        role: "Senior Designer",
        comment:
          "As a designer working with AI tooling, I appreciate how consistent the docs and landing experience feel. Design-to-agent handoff has never been smoother across our team.",
        clamp: "line-clamp-3",
        className: "hidden md:block",
      },
      {
        name: "James Mitchell",
        role: "Full Stack Developer",
        comment:
          "The CLI DX is best-in-class. Dry-run updates and conflict reports catch mistakes before they hit main. I used to dread upgrading agent templates - now it takes a fraction of the time.",
        clamp: "line-clamp-5",
        className: "hidden lg:block",
      },
      {
        name: "Nina Patel",
        role: "Security Engineer",
        comment:
          "These skills handle edge cases I did not even test for. Security scanning, secret checks, and review agents are built in from the start.",
        clamp: "line-clamp-2",
      },
      {
        name: "Alex Thompson",
        role: "Engineering Manager",
        comment:
          "Our team's velocity increased after adopting AG Kit. Less time on prompt boilerplate means more time on features customers care about.",
        clamp: "line-clamp-4",
        className: "hidden md:block",
      },
      {
        name: "Henry Garcia",
        role: "DevOps Engineer",
        comment:
          "We standardized agent workflows across three products in under three weeks. Rollback after a bad update saved a release day, and the docs just worked for every teammate we onboarded.",
        clamp: "line-clamp-3",
        className: "hidden lg:block",
      },
    ],
  },
  sponsored: {
    eyebrow: "Sponsored",
    title: "Supported by partners who ship",
    subtitle:
      "Sponsorship keeps AG Kit free, maintained, and open for everyone. Thank you to the teams investing in the agent ecosystem.",
    platinum: "Platinum sponsor",
    unikornBlurb:
      "A platform to discover and share technology products built by Vietnamese makers, from AI tools and education apps to utilities, games, and developer tools.",
    visitSponsor: "Visit sponsor",
    becomeTitle: "Become a sponsor",
    becomeDesc:
      "Get logo placement here, shout-outs in releases, and direct influence on roadmap priorities that help your customers ship with AI agents.",
    talk: "Talk sponsorship",
    coffee: "Buy me a coffee",
    wantBrand: "Want your brand next to AG Kit?",
    reachOut: "Reach out",
  },
  contribute: {
    eyebrow: "Contribute",
    title: "Developers who build AG Kit",
    subtitle:
      "Thank you to everyone who has contributed code, docs, and ideas. Join them on GitHub.",
    starLabel: "Star on GitHub",
    guide: "Contributing guide",
    loading: "Loading contributors...",
    empty: "Could not load contributors right now. Visit the repo on GitHub.",
    commits: "commits",
    viewAll: "View all contributors",
  },
  faq: {
    eyebrow: "FAQ",
    title: "Common questions",
    items: [
      {
        value: "what",
        question: "What is AG Kit?",
        answer:
          "AG Kit is an open-source toolkit of AI agent skills, specialist agents, workflows, and a CLI that installs them into your project safely.",
      },
      {
        value: "install",
        question: "How do I install it?",
        answer:
          "Run npx @vudovn/ag-kit init in your project (or install the CLI globally). It downloads the toolkit into .agents and writes a managed-file manifest.",
      },
      {
        value: "update",
        question: "Will update overwrite my changes?",
        answer:
          "No. Default strategy is merge. Clean managed files update automatically; local edits are preserved; real conflicts write an incoming copy and a JSON report. You can also roll back from backups.",
      },
      {
        value: "works-with",
        question: "Which AI assistants work with AG Kit?",
        answer:
          "AG Kit targets modern coding agents that can load project skills and rules (for example Gemini CLI / Antigravity-style setups). The docs cover structure and workflows independent of a single vendor chat UI.",
      },
      {
        value: "license",
        question: "Is it free?",
        answer:
          "Yes. AG Kit is MIT-licensed. Use it commercially, fork it, and contribute improvements back if you like.",
      },
    ],
  },
  footer: {
    blurb:
      "AI agent templates - skills, agents, and workflows for modern coding assistants.",
    product: "Product",
    resources: "Resources",
    community: "Community",
    legal: "Legal",
    documentation: "Documentation",
    agents: "Agents",
    skills: "Skills",
    workflows: "Workflows",
    installation: "Installation",
    cli: "CLI reference",
    changelog: "Changelog",
    github: "GitHub",
    issues: "Issues",
    discussions: "Discussions",
    license: "MIT License",
    security: "Security",
    credit: "Landing layout adapted from",
  },
};

export const landingVi: LandingDictionary = {
  nav: {
    benefits: "Lợi ích",
    features: "Tính năng",
    workflows: "Quy trình",
    testimonials: "Đánh giá",
    sponsored: "Nhà tài trợ",
    contribute: "Đóng góp",
    faq: "Hỏi đáp",
    docs: "Tài liệu",
  },
  hero: {
    title: "Mở rộng AI coding agent của bạn với",
    subtitle:
      "47 kỹ năng, 20 agent chuyên biệt và các quy trình production cài chỉ bằng một lệnh. Cập nhật merge an toàn, giữ nguyên chỉnh sửa cục bộ của bạn.",
    getStarted: "Bắt đầu",
    github: "GitHub",
  },
  stack: {
    title: "Mọi thứ trong một bộ toolkit",
    items: [
      "20 Agent",
      "47 Kỹ năng",
      "13 Quy trình",
      "CLI",
      "Cập nhật an toàn",
      "Mã nguồn mở",
    ],
  },
  benefits: {
    eyebrow: "Lợi ích",
    title: "Lối tắt tới công việc agent sẵn sàng production",
    subtitle:
      "AG Kit đóng gói playbook, agent và hàng rào an toàn để trợ lý lập trình AI làm việc như một đội phối hợp, không chỉ một cửa sổ chat.",
    items: [
      {
        title: "Ship tính năng nhanh hơn",
        description:
          "Agent và skill chuyên biệt bao phủ lập kế hoạch, code, review, bảo mật và deploy - bớt thời gian viết lại prompt.",
      },
      {
        title: "Cập nhật an toàn hơn",
        description:
          "Manifest file được quản lý, phát hiện xung đột ba chiều và backup - ag-kit update không xóa im lặng chỉnh sửa cục bộ.",
      },
      {
        title: "Quy trình bám sát",
        description:
          "Từ /brainstorm đến /deploy, workflow lặp lại giúp cả đội thống nhất cùng một quy trình.",
      },
      {
        title: "Chất lượng tích hợp sẵn",
        description:
          "Lint, bảo mật, SEO, hiệu năng và checker kiểm thử nằm cạnh các skill hướng dẫn agent cách dùng.",
      },
    ],
  },
  features: {
    eyebrow: "Tính năng",
    title: "Điều làm AG Kit khác biệt",
    subtitle:
      "Gói năng lực agent đầy đủ, không chỉ một template prompt - thiết kế cho dự án thật và nâng cấp an toàn theo thời gian.",
    items: [
      {
        title: "Agent chuyên biệt",
        description:
          "Frontend, backend, bảo mật, database, mobile và nhiều hơn - mỗi agent có system prompt và bộ skill riêng.",
      },
      {
        title: "Skill theo domain",
        description:
          "47 skill gồm kiến trúc, testing, i18n, SEO, GEO, triển khai và chuẩn clean code.",
      },
      {
        title: "Workflow có hướng dẫn",
        description:
          "Lệnh slash cho brainstorm, plan, create, debug, test, preview, status, orchestrate và deploy.",
      },
      {
        title: "CLI đơn giản",
        description:
          "init, update, rollback và status với dry-run, chiến lược merge/replace và báo cáo xung đột.",
      },
      {
        title: "Cập nhật nhận biết merge",
        description:
          "Baseline SHA-256 phát hiện file sạch, chỉnh sửa cục bộ và xung đột ba chiều trước khi ghi.",
      },
      {
        title: "Tài liệu khớp toolkit",
        description:
          "Hướng dẫn cài đặt, tham chiếu CLI và ví dụ đa ngôn ngữ luôn đồng bộ phiên bản toolkit.",
      },
    ],
  },
  workflows: {
    eyebrow: "Quy trình",
    title: "Lệnh chạy đúng quy trình của bạn",
    subtitle:
      "Slash workflow biến kiến thức đội nhóm thành phiên agent có thể lặp lại.",
    core: "Cốt lõi",
    browseAll: "Xem tất cả quy trình",
    items: [
      {
        title: "/brainstorm",
        description:
          "Khám phá nhiều hướng tiếp cận với ưu, nhược điểm trước khi viết code.",
      },
      {
        title: "/plan",
        description:
          "Chia tính năng thành task, phụ thuộc và tiêu chí kiểm chứng.",
      },
      {
        title: "/create",
        description:
          "Scaffold ứng dụng full-stack từ yêu cầu ngôn ngữ tự nhiên.",
      },
      {
        title: "/debug",
        description:
          "Phân tích gốc rễ có hệ thống với các bản sửa dựa trên bằng chứng.",
      },
      {
        title: "/orchestrate",
        description:
          "Điều phối agent chuyên biệt song song cho công việc đa domain.",
      },
      {
        title: "/deploy",
        description:
          "Các bước release hướng production, có tư duy rollback sẵn.",
        highlight: true,
      },
    ],
  },
  testimonials: {
    title: "Đánh giá",
    subtitle:
      "Nghe từ các đội dùng AG Kit để ship skill agent, workflow và cập nhật an toàn hơn.",
    items: [
      {
        name: "Sarah Chen",
        role: "Staff Engineer",
        comment:
          "Cập nhật merge an toàn là điểm khác biệt. Chúng tôi giữ chỉnh sửa skill cục bộ và vẫn kéo agent upstream mà không phải viết lại cả cây file. Ship gói năng lực agent cuối cùng cũng cảm thấy an toàn.",
        clamp: "line-clamp-3",
      },
      {
        name: "Marcus Rodriguez",
        role: "Platform Lead",
        comment:
          "Workflow /brainstorm và /plan cho cả đội một quy trình chung thay vì mỗi phiên agent tự nghĩ bước. Điểm review tăng sau khi gắn checker có sẵn vào mọi PR.",
        clamp: "line-clamp-5",
      },
      {
        name: "Emily Watson",
        role: "Head of Product",
        comment:
          "Cuối cùng cũng có toolkit mà lập trình viên thực sự muốn dùng. Tài liệu rõ, skill linh hoạt, mặc định hợp lý.",
        clamp: "line-clamp-2",
        className: "hidden lg:block",
      },
      {
        name: "David Kim",
        role: "Tech Lead",
        comment:
          "Chúng tôi so sánh vài gói agent trước khi chọn AG Kit. Điểm nổi bật là cập nhật nhận biết merge và workflow sẵn sàng production. Mọi skill đều dùng được ngay.",
        clamp: "line-clamp-4",
      },
      {
        name: "Rachel Foster",
        role: "Senior Designer",
        comment:
          "Là designer làm với công cụ AI, tôi thích sự nhất quán giữa tài liệu và landing. Bàn giao design-to-agent mượt hơn hẳn cho cả đội.",
        clamp: "line-clamp-3",
        className: "hidden md:block",
      },
      {
        name: "James Mitchell",
        role: "Full Stack Developer",
        comment:
          "DX của CLI thuộc hàng tốt nhất. Dry-run và báo cáo xung đột bắt lỗi trước khi lên main. Trước đây tôi ngại nâng template agent - giờ chỉ mất một phần thời gian.",
        clamp: "line-clamp-5",
        className: "hidden lg:block",
      },
      {
        name: "Nina Patel",
        role: "Security Engineer",
        comment:
          "Các skill xử lý cả edge case tôi chưa kịp test. Quét bảo mật, kiểm tra secret và agent review có sẵn từ đầu.",
        clamp: "line-clamp-2",
      },
      {
        name: "Alex Thompson",
        role: "Engineering Manager",
        comment:
          "Tốc độ đội tăng sau khi dùng AG Kit. Ít thời gian viết prompt lặp lại, nhiều thời gian hơn cho tính năng khách hàng cần.",
        clamp: "line-clamp-4",
        className: "hidden md:block",
      },
      {
        name: "Henry Garcia",
        role: "DevOps Engineer",
        comment:
          "Chúng tôi chuẩn hóa workflow agent trên ba sản phẩm trong chưa đầy ba tuần. Rollback sau một bản update hỏng đã cứu một ngày release, và tài liệu dễ onboard cho mọi thành viên.",
        clamp: "line-clamp-3",
        className: "hidden lg:block",
      },
    ],
  },
  sponsored: {
    eyebrow: "Nhà tài trợ",
    title: "Được hỗ trợ bởi các đối tác tin cậy",
    subtitle:
      "Tài trợ giúp AG Kit luôn miễn phí, được duy trì và mở cho mọi người. Cảm ơn các đội ngũ đang đầu tư vào hệ sinh thái AI agent.",
    platinum: "Nhà tài trợ chính",
    unikornBlurb:
      "Nền tảng khám phá và chia sẻ sản phẩm công nghệ do người Việt xây dựng, từ công cụ AI, ứng dụng giáo dục, tiện ích đến game và công cụ cho nhà phát triển.",
    visitSponsor: "Xem nhà tài trợ",
    becomeTitle: "Trở thành nhà tài trợ",
    becomeDesc:
      "Hiển thị logo tại đây, được nhắc trong các bản phát hành, và đóng góp định hướng roadmap để khách hàng của bạn triển khai AI agent tốt hơn.",
    talk: "Liên hệ tài trợ",
    coffee: "Mời tôi một ly cà phê",
    wantBrand: "Muốn thương hiệu của bạn xuất hiện cùng AG Kit?",
    reachOut: "Liên hệ ngay",
  },
  contribute: {
    eyebrow: "Đóng góp",
    title: "Các nhà phát triển đã đóng góp",
    subtitle:
      "Cảm ơn tất cả những ai đã đóng góp code, tài liệu và ý tưởng. Hãy tham gia cùng họ trên GitHub.",
    starLabel: "Star trên GitHub",
    guide: "Hướng dẫn đóng góp",
    loading: "Đang tải danh sách người đóng góp...",
    empty: "Không tải được danh sách lúc này. Xem repository trên GitHub.",
    commits: "commits",
    viewAll: "Xem tất cả người đóng góp",
  },
  faq: {
    eyebrow: "Hỏi đáp",
    title: "Câu hỏi thường gặp",
    items: [
      {
        value: "what",
        question: "AG Kit là gì?",
        answer:
          "AG Kit là toolkit mã nguồn mở gồm skill AI agent, agent chuyên biệt, workflow và CLI cài chúng vào dự án một cách an toàn.",
      },
      {
        value: "install",
        question: "Cài đặt thế nào?",
        answer:
          "Chạy npx @vudovn/ag-kit init trong dự án (hoặc cài CLI toàn cục). Toolkit được tải vào .agents và ghi managed-file manifest.",
      },
      {
        value: "update",
        question: "Update có ghi đè chỉnh sửa của tôi không?",
        answer:
          "Không. Chiến lược mặc định là merge. File managed sạch được cập nhật tự động; chỉnh sửa cục bộ được giữ; xung đột thật sẽ ghi bản incoming và báo cáo JSON. Bạn cũng có thể rollback từ backup.",
      },
      {
        value: "works-with",
        question: "AG Kit dùng với trợ lý AI nào?",
        answer:
          "AG Kit hướng tới coding agent hiện đại có thể nạp skill và rule dự án (ví dụ Gemini CLI / Antigravity). Tài liệu mô tả cấu trúc và workflow độc lập với một UI chat duy nhất.",
      },
      {
        value: "license",
        question: "Có miễn phí không?",
        answer:
          "Có. AG Kit theo giấy phép MIT. Dùng thương mại, fork, và đóng góp cải tiến nếu bạn muốn.",
      },
    ],
  },
  footer: {
    blurb:
      "Bộ mẫu AI agent - skill, agent và workflow cho trợ lý lập trình hiện đại.",
    product: "Sản phẩm",
    resources: "Tài nguyên",
    community: "Cộng đồng",
    legal: "Pháp lý",
    documentation: "Tài liệu",
    agents: "Agent",
    skills: "Kỹ năng",
    workflows: "Quy trình",
    installation: "Cài đặt",
    cli: "Tham chiếu CLI",
    changelog: "Nhật ký thay đổi",
    github: "GitHub",
    issues: "Issues",
    discussions: "Thảo luận",
    license: "Giấy phép MIT",
    security: "Bảo mật",
    credit: "Giao diện landing tham khảo từ",
  },
};

/** Chinese landing strings */
export const landingZh: LandingDictionary = {
  ...landingEn,
  nav: {
    benefits: "优势",
    features: "功能",
    workflows: "工作流",
    testimonials: "用户评价",
    sponsored: "赞助商",
    contribute: "贡献",
    faq: "常见问题",
    docs: "文档",
  },
  hero: {
    title: "用以下工具扩展你的 AI 编程助手",
    subtitle:
      "47 项技能、20 位专业 agent 与生产级工作流，一条命令即可安装。安全合并更新，保留你的本地修改。",
    getStarted: "开始使用",
    github: "GitHub",
  },
  stack: {
    title: "一站式工具包",
    items: ["20 个 Agent", "47 项技能", "13 个工作流", "CLI", "安全更新", "开源"],
  },
  sponsored: {
    ...landingEn.sponsored,
    eyebrow: "赞助商",
    title: "由可信伙伴支持",
    subtitle:
      "赞助让 AG Kit 保持免费、持续维护并对所有人开放。感谢投资 agent 生态的团队。",
    platinum: "首席赞助商",
    unikornBlurb:
      "发现并分享越南开发者打造的科技产品平台，涵盖 AI 工具、教育应用、实用程序、游戏和开发者工具。",
    visitSponsor: "访问赞助商",
    becomeTitle: "成为赞助商",
    becomeDesc:
      "在此展示 logo、在版本发布中获得提及，并直接影响路线图优先级，帮助客户用 AI agent 交付。",
    talk: "洽谈赞助",
    coffee: "请我喝杯咖啡",
    wantBrand: "希望你的品牌出现在 AG Kit 旁？",
    reachOut: "立即联系",
  },
  faq: {
    eyebrow: "常见问题",
    title: "常见问题",
    items: landingEn.faq.items,
  },
  footer: {
    ...landingEn.footer,
    blurb: "面向现代编程助手的 AI agent 模板 - 技能、agent 与工作流。",
    product: "产品",
    resources: "资源",
    community: "社区",
    legal: "法律",
    documentation: "文档",
    agents: "Agents",
    skills: "技能",
    workflows: "工作流",
    installation: "安装",
    cli: "CLI 参考",
    changelog: "更新日志",
    discussions: "讨论",
    license: "MIT 许可",
    security: "安全",
    credit: "落地页布局参考自",
  },
};

/** Japanese landing strings */
export const landingJa: LandingDictionary = {
  ...landingEn,
  nav: {
    benefits: "メリット",
    features: "機能",
    workflows: "ワークフロー",
    testimonials: "お客様の声",
    sponsored: "スポンサー",
    contribute: "コントリビュート",
    faq: "FAQ",
    docs: "ドキュメント",
  },
  hero: {
    title: "AI コーディングエージェントを拡張",
    subtitle:
      "47 のスキル、20 の専門エージェント、本番向けワークフローを 1 コマンドで導入。安全なマージ更新でローカル変更を守ります。",
    getStarted: "はじめる",
    github: "GitHub",
  },
  stack: {
    title: "すべてが 1 つのツールキットに",
    items: [
      "20 Agents",
      "47 Skills",
      "13 Workflows",
      "CLI",
      "安全な更新",
      "オープンソース",
    ],
  },
  sponsored: {
    ...landingEn.sponsored,
    eyebrow: "スポンサー",
    title: "信頼できるパートナーに支えられています",
    subtitle:
      "スポンサーシップが AG Kit を無料・継続保守・誰でも使える状態に保ちます。",
    platinum: "プラチナスポンサー",
    unikornBlurb:
      "ベトナムの開発者が作ったテックプロダクトを発見・共有するプラットフォーム。AI ツール、教育アプリ、ユーティリティ、ゲーム、開発者ツールまで。",
    visitSponsor: "スポンサーを見る",
    becomeTitle: "スポンサーになる",
    becomeDesc:
      "ここにロゴ掲載、リリースでの紹介、ロードマップへの影響など、AI agent 導入を支援するメリットがあります。",
    talk: "スポンサー相談",
    coffee: "コーヒーをおごる",
    wantBrand: "ブランドを AG Kit の隣に置きたいですか？",
    reachOut: "連絡する",
  },
  footer: {
    ...landingEn.footer,
    blurb:
      "モダンなコーディングアシスタント向け AI agent テンプレート - スキル、エージェント、ワークフロー。",
    product: "プロダクト",
    resources: "リソース",
    community: "コミュニティ",
    legal: "法務",
    documentation: "ドキュメント",
    installation: "インストール",
    cli: "CLI リファレンス",
    changelog: "変更履歴",
    discussions: "ディスカッション",
    license: "MIT ライセンス",
    security: "セキュリティ",
    credit: "ランディングレイアウトの参考元",
  },
};
