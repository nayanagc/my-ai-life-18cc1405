import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { Sparkles } from "lucide-react";

const AvatarSettings = ({ userId }: { userId: string }) => {
  const [aiAvatarUrl, setAiAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("ai_avatar_url")
      .eq("id", userId)
      .single();
    
    if (data?.ai_avatar_url) setAiAvatarUrl(data.ai_avatar_url);
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

  const presetAvatars = [
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400",
    "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400",
    "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400",
    "https://images.unsplash.com/photo-1676277791608-ac54525aa94d?w=400"
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
        <label className="text-sm font-medium">Quick Presets</label>
        <div className="grid grid-cols-4 gap-4">
          {presetAvatars.map((url, i) => (
            <Avatar
              key={i}
              className="h-16 w-16 cursor-pointer border-2 hover:border-primary transition-all"
              onClick={() => setAiAvatarUrl(url)}
            >
              <AvatarImage src={url} alt={`Preset ${i + 1}`} />
            </Avatar>
          ))}
        </div>
      </div>

      <Button onClick={saveAvatar} disabled={loading} className="w-full">
        Save Avatar
      </Button>
    </Card>
  );
};

export default AvatarSettings;
