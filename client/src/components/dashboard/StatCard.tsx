import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconBgColor: string;
  changePercent?: number;
  changeText?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  iconBgColor,
  changePercent,
  changeText = "from last month"
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-neutral-700 text-sm">{title}</p>
            <h3 className="font-poppins text-2xl font-bold text-neutral-900">{value}</h3>
          </div>
          <div className={cn("h-10 w-10 bg-opacity-10 flex items-center justify-center rounded-lg", iconBgColor)}>
            {icon}
          </div>
        </div>
        
        {changePercent !== undefined && (
          <div className="flex items-center mt-2">
            <span 
              className={cn(
                "text-xs flex items-center",
                changePercent >= 0 ? "text-green-500" : "text-red-500"
              )}
            >
              {changePercent >= 0 ? (
                <ArrowUpIcon className="mr-1 w-3 h-3" />
              ) : (
                <ArrowDownIcon className="mr-1 w-3 h-3" />
              )}
              {Math.abs(changePercent)}%
            </span>
            <span className="text-xs text-neutral-600 ml-2">{changeText}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
