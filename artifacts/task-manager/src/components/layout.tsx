import { Link, useLocation } from "wouter";
import { Users, LayoutDashboard, Clock, MessageSquare, FileText, Bell, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Developers", url: "/developers", icon: Users },
  { title: "Check-ins", url: "/checkins", icon: Clock },
  { title: "Responses", url: "/responses", icon: MessageSquare },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Alerts", url: "/alerts", icon: Bell },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden w-full">
        <Sidebar className="border-r border-border bg-sidebar">
          <SidebarContent>
            <div className="p-4 py-6 text-xl font-bold tracking-tight text-accent flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-accent text-accent-foreground flex items-center justify-center text-sm font-black">
                D
              </div>
              DevManager
            </div>
            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground uppercase text-xs font-semibold tracking-wider">
                Command Center
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV_ITEMS.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.url || (item.url !== "/" && location.startsWith(item.url))}
                        className="data-[active=true]:bg-accent/10 data-[active=true]:text-accent"
                      >
                        <Link href={item.url} className="flex items-center gap-3 w-full">
                          <item.icon className="w-4 h-4" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 overflow-y-auto bg-background focus:outline-none">
          <div className="p-8 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
