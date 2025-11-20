import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

interface MoodLog {
  id: string;
  created_at: string;
  mood: string;
  energy_level: number;
  stress_level: number;
}

const moodColors: Record<string, string> = {
  Happy: "#10b981",
  Calm: "#3b82f6",
  Stressed: "#ef4444",
  Tired: "#f59e0b",
  Energetic: "#8b5cf6"
};

const MoodTrendsChart = ({ userId }: { userId: string }) => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    loadMoodData();
  }, [userId]);

  const loadMoodData = async () => {
    const { data: moodLogs } = await supabase
      .from("mood_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(30);

    if (moodLogs) {
      const chartData = moodLogs.map((log: MoodLog) => ({
        date: format(new Date(log.created_at), "MMM dd"),
        mood: log.mood,
        energy: log.energy_level,
        stress: log.stress_level,
        moodColor: moodColors[log.mood] || "#6b7280"
      }));
      setData(chartData);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle>Mood Trends Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem"
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="energy" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Energy Level"
              dot={{ fill: "#10b981" }}
            />
            <Line 
              type="monotone" 
              dataKey="stress" 
              stroke="#ef4444" 
              strokeWidth={2}
              name="Stress Level"
              dot={{ fill: "#ef4444" }}
            />
          </LineChart>
        </ResponsiveContainer>
        
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(moodColors).map(([mood, color]) => (
            <div key={mood} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-muted-foreground">{mood}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MoodTrendsChart;
