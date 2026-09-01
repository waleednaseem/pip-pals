import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getVisibleNavGroups } from "@/config/nav";

interface AppSidebarProps {
  activeTab: string;
  hasPair: boolean;
  onNavigate: (tab: string) => void;
}

export const AppSidebar = ({ activeTab, hasPair, onNavigate }: AppSidebarProps) => {
  const { isMobile, setOpenMobile, state } = useSidebar();
  const groups = getVisibleNavGroups(hasPair);

  const handleNav = (tab: string) => {
    onNavigate(tab);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-1 py-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-[11px] font-bold text-primary-foreground">
            PP
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold leading-tight">Pip Pals</p>
            <p className="truncate text-[10px] text-muted-foreground">Financial dashboard</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <Collapsible key={group.id} defaultOpen className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="w-full cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                  <span className="uppercase tracking-wider text-[11px]">{group.label}</span>
                  <ChevronDown className="ml-auto transition-transform duration-200 group-data-[state=closed]/collapsible:rotate-[-90deg]" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.value}>
                        <SidebarMenuButton
                          tooltip={item.label}
                          isActive={activeTab === item.value}
                          onClick={() => handleNav(item.value)}
                        >
                          <item.icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <ThemeToggle compact={state === "collapsed"} className={state === "collapsed" ? undefined : "w-full justify-start"} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};
