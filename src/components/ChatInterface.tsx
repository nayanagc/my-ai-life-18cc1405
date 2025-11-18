import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const ChatInterface = ({ userId }: { userId: string }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiAvatar, setAiAvatar] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadMessages();
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("ai_avatar_url")
      .eq("id", userId)
      .single();
    
    if (data?.ai_avatar_url) setAiAvatar(data.ai_avatar_url);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(50);
    
    if (data) {
      const typedMessages: Message[] = data.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      }));
      setMessages(typedMessages);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    await supabase.from("chat_messages").insert({ user_id: userId, role: "user", content: input });

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { message: input, userId }
      });

      if (error) throw error;

      const assistantMessage: Message = { role: "assistant", content: data.response };
      setMessages(prev => [...prev, assistantMessage]);
      await supabase.from("chat_messages").insert({ user_id: userId, role: "assistant", content: data.response });
    } catch (error) {
      toast({ title: "Error", description: "Failed to get response", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-16rem)] border-primary/20">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <Avatar className="h-8 w-8 border-2 border-primary">
                <AvatarImage src={aiAvatar} alt="AI Twin" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
            )}
            <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Talk to your AI twin..."
          disabled={loading}
        />
        <Button onClick={sendMessage} disabled={loading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};

export default ChatInterface;
