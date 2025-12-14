import { User, Mountain, Image as ImageIcon, Clapperboard, Sparkles, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";

export type PageType = 
  | "character-builder" 
  | "environment-builder" 
  | "image-to-video" 
  | "text-to-video"
  | "ai-storyboard"
  | "ai-influencer";

interface SidebarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const sections = [
    {
      title: "AI Content",
      items: [
        { id: "ai-storyboard" as PageType, label: "Ride Storyboard", icon: Sparkles },
        { id: "ai-influencer" as PageType, label: "AI Influencer", icon: UserCog },
      ],
    },
    {
      title: "Text → Image",
      items: [
        { id: "character-builder" as PageType, label: "Character Builder", icon: User },
        { id: "environment-builder" as PageType, label: "Environment Builder", icon: Mountain },
      ],
    },
    {
      title: "Video",
      items: [
        { id: "image-to-video" as PageType, label: "Image → Video", icon: ImageIcon },
        { id: "text-to-video" as PageType, label: "Text → Cinematic", icon: Clapperboard },
      ],
    },
  ];

  return (
    <aside className="w-60 bg-sidebar border-r border-sidebar-border flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
          Video Generator
        </h1>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
              {section.title}
            </h2>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => onPageChange(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isActive && "text-primary")} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground text-center">
          No backend • UI only
        </p>
      </div>
    </aside>
  );
}
