import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Brain, TrendingUp, Zap, Calendar } from "lucide-react";

interface BehaviorPattern {
  id: string;
  pattern_type: string;
  description: string;
  frequency: string;
  confidence_score: number;
}

interface Prediction {
  id: string;
  title: string;
  description: string;
  prediction_date: string;
  confidence_score: number;
}

const Dashboard = ({ userId }: { userId: string }) => {
  const [patterns, setPatterns] = useState<BehaviorPattern[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    const [patternsRes, predictionsRes] = await Promise.all([
      supabase.from("behavior_patterns").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
      supabase.from("insights").select("*").eq("user_id", userId).eq("insight_type", "prediction").order("created_at", { ascending: false }).limit(5)
    ]);

    if (patternsRes.data) setPatterns(patternsRes.data);
    if (predictionsRes.data) setPredictions(predictionsRes.data);
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { error } = await supabase.functions.invoke("analyze-behavior", {
        body: { userId }
      });

      if (error) throw error;

      toast({ title: "Analysis Complete", description: "Your behavior patterns and predictions have been updated!" });
      await loadData();
    } catch (error) {
      toast({ title: "Analysis Failed", description: "Unable to analyze behavior patterns", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Insights</h2>
        <Button onClick={runAnalysis} disabled={analyzing}>
          <Brain className="h-4 w-4 mr-2" />
          {analyzing ? "Analyzing..." : "Analyze Behavior"}
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6 border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Behavior Patterns</h3>
          </div>
          <p className="text-3xl font-bold text-primary">{patterns.length}</p>
          <p className="text-sm text-muted-foreground">Detected patterns</p>
        </Card>
        
        <Card className="p-6 border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Future Predictions</h3>
          </div>
          <p className="text-3xl font-bold text-primary">{predictions.length}</p>
          <p className="text-sm text-muted-foreground">Active predictions</p>
        </Card>
        
        <Card className="p-6 border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Confidence</h3>
          </div>
          <p className="text-3xl font-bold text-primary">
            {predictions.length > 0 ? Math.round((predictions.reduce((acc, p) => acc + (p.confidence_score || 0), 0) / predictions.length) * 100) : 0}%
          </p>
          <p className="text-sm text-muted-foreground">Average accuracy</p>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 border-primary/20">
          <h3 className="text-xl font-bold mb-4">Detected Patterns</h3>
          <div className="space-y-3">
            {patterns.length === 0 ? (
              <p className="text-muted-foreground">No patterns detected yet. Click "Analyze Behavior" to start.</p>
            ) : (
              patterns.map((pattern) => (
                <div key={pattern.id} className="border-l-4 border-primary pl-4 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{pattern.pattern_type}</Badge>
                    <Badge variant="secondary">{pattern.frequency}</Badge>
                  </div>
                  <p className="text-sm">{pattern.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Confidence: {Math.round((pattern.confidence_score || 0) * 100)}%
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6 border-primary/20">
          <h3 className="text-xl font-bold mb-4">Future Predictions</h3>
          <div className="space-y-3">
            {predictions.length === 0 ? (
              <p className="text-muted-foreground">No predictions available yet. Click "Analyze Behavior" to generate predictions.</p>
            ) : (
              predictions.map((pred) => (
                <div key={pred.id} className="border-l-4 border-accent pl-4 py-2">
                  <h4 className="font-semibold">{pred.title}</h4>
                  <p className="text-sm mt-1">{pred.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-muted-foreground">
                      Confidence: {Math.round((pred.confidence_score || 0) * 100)}%
                    </p>
                    {pred.prediction_date && (
                      <p className="text-xs text-muted-foreground">
                        • Expected: {new Date(pred.prediction_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
