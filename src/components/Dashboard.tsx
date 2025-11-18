import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Brain, TrendingUp } from "lucide-react";

const Dashboard = ({ userId }: { userId: string }) => {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Behavior Patterns</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">12</div>
          <p className="text-xs text-muted-foreground">Patterns identified</p>
        </CardContent>
      </Card>
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Productivity Score</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">85%</div>
          <p className="text-xs text-muted-foreground">+5% from last week</p>
        </CardContent>
      </Card>
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mood Trend</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Positive</div>
          <p className="text-xs text-muted-foreground">Stable this month</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
