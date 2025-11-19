import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Send, Mic, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  audioUrl?: string;
}

const ChatInterface = ({ userId }: { userId: string }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiAvatar, setAiAvatar] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudioInput(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast({ title: "Recording", description: "Speak now..." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to access microphone", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudioInput = async (audioBlob: Blob) => {
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke("speech-to-text", {
          body: { audio: base64Audio }
        });

        if (transcriptError) throw transcriptError;

        const transcribedText = transcriptData.text;
        setInput(transcribedText);
        await sendMessage(transcribedText);
      };
    } catch (error) {
      toast({ title: "Error", description: "Failed to transcribe audio", variant: "destructive" });
      setLoading(false);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = { role: "user", content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    await supabase.from("chat_messages").insert({ user_id: userId, role: "user", content: textToSend });

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { message: textToSend, userId }
      });

      if (error) throw error;

      const responseText = data.response;
      let audioUrl: string | undefined;

      if (voiceEnabled) {
        const { data: audioData, error: audioError } = await supabase.functions.invoke("text-to-speech", {
          body: { text: responseText, voice: "alloy" }
        });

        if (!audioError && audioData?.audioContent) {
          const audioBlob = new Blob(
            [Uint8Array.from(atob(audioData.audioContent), c => c.charCodeAt(0))],
            { type: 'audio/mp3' }
          );
          audioUrl = URL.createObjectURL(audioBlob);
        }
      }

      const assistantMessage: Message = { role: "assistant", content: responseText, audioUrl };
      setMessages(prev => [...prev, assistantMessage]);
      await supabase.from("chat_messages").insert({ user_id: userId, role: "assistant", content: responseText });

      if (audioUrl && voiceEnabled) {
        playAudio(audioUrl);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to get response", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    setCurrentlyPlaying(audioUrl);
    audio.play();
    audio.onended = () => setCurrentlyPlaying(null);
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-16rem)] border-primary/20">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">AI Twin Chat</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setVoiceEnabled(!voiceEnabled)}
        >
          {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <Avatar className="h-8 w-8 border-2 border-primary">
                <AvatarImage src={aiAvatar} alt="AI Twin" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
            )}
            <div className="flex flex-col gap-2">
              <div className={`rounded-lg p-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {msg.content}
              </div>
              {msg.audioUrl && msg.role === "assistant" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => playAudio(msg.audioUrl!)}
                  disabled={currentlyPlaying === msg.audioUrl}
                  className="self-start"
                >
                  <Volume2 className="h-3 w-3 mr-1" />
                  {currentlyPlaying === msg.audioUrl ? "Playing..." : "Play"}
                </Button>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t flex gap-2">
        <Button
          variant={isRecording ? "destructive" : "secondary"}
          size="icon"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={loading}
        >
          <Mic className={`h-4 w-4 ${isRecording ? 'animate-pulse' : ''}`} />
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && !loading && sendMessage()}
          placeholder="Talk to your AI twin..."
          disabled={loading || isRecording}
        />
        <Button onClick={() => sendMessage()} disabled={loading || isRecording}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};

export default ChatInterface;
