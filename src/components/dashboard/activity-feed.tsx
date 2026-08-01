import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";

interface Activity {
  id: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: string | Date;
  userName?: string | null;
}

interface ActivityFeedProps {
  activities: Activity[];
}

function getActivityIcon(action: string) {}

function getActivityDescription(activity: Activity): string {
  const { action, details } = activity;
  switch (action) {
    case "order.created":
      return "New order created";
    case "order.status_updated":
      return `Order status updated to ${details.newStatus || "new status"}`;
    case "order.shipped":
      return "Order marked as shipped";
    case "order.deleted":
      return "Order deleted";
    case "product.created":
      return "New product added";
    case "product.updated":
      return "Product updated";
    case "product.deleted":
      return "Product deleted";
    default:
      return action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
}

function getTimeAgo(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString();
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ScrollText className="h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No recent activity</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="overflow-y-scroll">
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shrink-0">
                <ScrollText className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{activity.userName || "System"}</p>
                <p className="text-sm text-gray-500">{getActivityDescription(activity)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{getTimeAgo(activity.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
