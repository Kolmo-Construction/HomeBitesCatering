import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlusIcon, FileTextIcon, UtensilsIcon, ClipboardListIcon } from "lucide-react";

export default function QuickActions() {
  const actions = [
    {
      name: "New Lead",
      href: "/leads/new",
      icon: UserPlusIcon,
      color: "text-primary-purple"
    },
    {
      name: "Create Estimate",
      href: "/estimates/new",
      icon: FileTextIcon,
      color: "text-primary-blue"
    },
    {
      name: "Add Menu Item",
      href: "/menu-items/new",
      icon: UtensilsIcon,
      color: "text-accent"
    },
    {
      name: "Build Menu",
      href: "/menus/new",
      icon: ClipboardListIcon,
      color: "text-green-500"
    }
  ];

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="font-poppins text-lg font-semibold text-neutral-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Link key={action.name} to={action.href}>
              <div className="flex flex-col items-center justify-center p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition cursor-pointer">
                <action.icon className={`${action.color} text-xl mb-2 h-6 w-6`} />
                <span className="text-sm text-neutral-700 text-center">{action.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
