import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

const AvatarSettings = ({ userId }: { userId: string }) => {
  const [aiAvatarUrl, setAiAvatarUrl] = useState("");
  const [voiceGender, setVoiceGender] = useState("female");
  const [speechRate, setSpeechRate] = useState([1.0]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
    loadVoiceSettings();
  }, [userId]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("ai_avatar_url")
      .eq("id", userId)
      .single();
    
    if (data?.ai_avatar_url) setAiAvatarUrl(data.ai_avatar_url);
  };

  const loadVoiceSettings = () => {
    const savedVoice = localStorage.getItem(`voice_gender_${userId}`) || "female";
    const savedRate = localStorage.getItem(`speech_rate_${userId}`) || "1.0";
    setVoiceGender(savedVoice);
    setSpeechRate([parseFloat(savedRate)]);
  };

  const saveAvatar = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ ai_avatar_url: aiAvatarUrl })
      .eq("id", userId);

    if (error) {
      toast({ title: "Error", description: "Failed to update avatar", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "AI avatar updated!" });
    }
    setLoading(false);
  };

  const saveVoiceSettings = () => {
    localStorage.setItem(`voice_gender_${userId}`, voiceGender);
    localStorage.setItem(`speech_rate_${userId}`, speechRate[0].toString());
    toast({ title: "Voice Settings Saved", description: "Your voice preferences have been updated!" });
  };

  const presetAvatars = [
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400",
    "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400"
  ];

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">AI Twin Avatar</h2>
      </div>

      <div className="flex justify-center">
        <Avatar className="h-32 w-32 border-4 border-primary">
          <AvatarImage src={aiAvatarUrl} alt="AI Twin" />
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Avatar URL</label>
        <Input
          value={aiAvatarUrl}
          onChange={(e) => setAiAvatarUrl(e.target.value)}
          placeholder="Enter image URL..."
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Human Avatar Presets</label>
        <div className="grid grid-cols-4 gap-4">
          {presetAvatars.map((url, i) => (
            <Avatar
              key={i}
              className="h-16 w-16 cursor-pointer border-2 hover:border-primary transition-all hover:scale-110"
              onClick={() => setAiAvatarUrl(url)}
            >
              <AvatarImage src={url} alt={`Human ${i + 1}`} />
            </Avatar>
          ))}
        </div>
      </div>

      <Button onClick={saveAvatar} disabled={loading} className="w-full">
        Save Avatar
      </Button>

      <div className="pt-6 border-t space-y-4">
        <h3 className="text-lg font-semibold">Voice Settings</h3>
        
        <div className="space-y-2">
          <Label>Voice Personality</Label>
          <Select value={voiceGender} onValueChange={setVoiceGender}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="female">Female Voice</SelectItem>
              <SelectItem value="male">Male Voice</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Speech Rate: {speechRate[0].toFixed(1)}x</Label>
          <Slider 
            value={speechRate} 
            onValueChange={setSpeechRate} 
            min={0.5} 
            max={2.0} 
            step={0.1}
          />
          <p className="text-xs text-muted-foreground">
            Adjust how fast the AI speaks (0.5x = slower, 2.0x = faster)
          </p>
        </div>

        <Button onClick={saveVoiceSettings} variant="outline" className="w-full">
          Save Voice Settings
        </Button>
      </div>
    </Card>
  );
};

export default AvatarSettings;
