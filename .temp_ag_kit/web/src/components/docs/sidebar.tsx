'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navSections = [
    {
        title: 'Getting Started',
        items: [
            { href: '/docs', label: 'Introduction' },
            { href: '/docs/installation', label: 'Installation' },
        ],
    },
    {
        title: 'Core Concepts',
        items: [
            { href: '/docs/agents', label: 'Agents' },
            { href: '/docs/skills', label: 'Skills' },
            { href: '/docs/workflows', label: 'Workflows' },
        ],
    },
    {
        title: 'Guide',
        items: [
            { href: '/docs/guide/examples/brainstorm', label: 'Structured Brainstorming' },
            { href: '/docs/guide/examples/plan', label: 'Project Planning' },
            { href: '/docs/guide/examples/create', label: 'Create New Application' },
            { href: '/docs/guide/examples/new-feature', label: 'Add a New Feature' },
            { href: '/docs/guide/examples/debugging', label: 'Systematic Debugging' },
            { href: '/docs/guide/examples/test', label: 'Test Generation' },
            { href: '/docs/guide/examples/preview', label: 'Preview Management' },
            { href: '/docs/guide/examples/status', label: 'Project Status' },
            { href: '/docs/guide/examples/orchestration', label: 'Multi-Agent Orchestration' },
            { href: '/docs/guide/examples/deployment', label: 'Production Deployment' },
        ],
    },
    {
        title: 'CLI Reference',
        items: [
            { href: '/docs/cli', label: 'Commands & Options' },
            { href: '/docs/changelog', label: 'Changelog' },
        ],
    },
];

export default function DocsSidebar() {
    const pathname = usePathname();

    return (
        <nav className="space-y-1">
            {navSections.map((section) => (
                <div key={section.title} className="pb-6">
                    <h3 className="mb-3 px-2 text-sm font-semibold text-foreground">
                        {section.title}
                    </h3>
                    <div className="space-y-0.5">
                        {section.items.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`
                    block px-2 py-1.5 text-sm rounded-md transition-colors
                    ${isActive
                                            ? 'bg-brand/10 text-brand font-medium'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                        }
                  `}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>
    );
}
