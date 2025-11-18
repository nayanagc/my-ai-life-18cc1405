import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

const MoodTracker = ({ userId }: { userId: string }) => {
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState([5]);
  const [stress, setStress] = useState([5]);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  const handleSubmit = async () => {
    const { error } = await supabase.from("mood_logs").insert({
      user_id: userId,
      mood,
      energy_level: energy[0],
      stress_level: stress[0],
      notes
    });

    if (error) {
      toast({ title: "Error", description: "Failed to save mood", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Mood logged successfully" });
      setMood("");
      setEnergy([5]);
      setStress([5]);
      setNotes("");
    }
  };

  return (
    <Card className="border-primary/20 max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Log Your Current State</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Mood</Label>
          <div className="flex gap-2 flex-wrap">
            {["Happy", "Calm", "Stressed", "Tired", "Energetic"].map(m => (
              <Button key={m} variant={mood === m ? "default" : "outline"} onClick={() => setMood(m)}>
                {m}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Energy Level: {energy[0]}</Label>
          <Slider value={energy} onValueChange={setEnergy} max={10} min={1} step={1} />
        </div>
        <div className="space-y-2">
          <Label>Stress Level: {stress[0]}</Label>
          <Slider value={stress} onValueChange={setStress} max={10} min={1} step={1} />
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How are you feeling?" />
        </div>
        <Button onClick={handleSubmit} className="w-full">Log Mood</Button>
      </CardContent>
    </Card>
  );
};

export default MoodTracker;
