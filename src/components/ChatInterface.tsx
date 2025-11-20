import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Send, Mic, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import SongButton from "./SongButton";
interface Message {
  role: "user" | "assistant";
  content: string;
}
const ChatInterface = ({
  userId
}: {
  userId: string;
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiAvatar, setAiAvatar] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [avatarState, setAvatarState] = useState<'idle' | 'listening' | 'thinking' | 'talking'>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    toast
  } = useToast();
  useEffect(() => {
    loadMessages();
    loadProfile();
  }, [userId]);
  const loadProfile = async () => {
    const {
      data
    } = await supabase.from("profiles").select("ai_avatar_url").eq("id", userId).single();
    if (data?.ai_avatar_url) setAiAvatar(data.ai_avatar_url);
  };
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages]);
  const loadMessages = async () => {
    const {
      data
    } = await supabase.from("chat_messages").select("*").eq("user_id", userId).order("created_at", {
      ascending: true
    }).limit(50);
    if (data) {
      const typedMessages: Message[] = data.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      }));
      setMessages(typedMessages);
    }
  };
  const handleVoiceInput = () => {
    if (isRecording) {
      // Stop recording (browser recognition handles its own stopping)
      setIsRecording(false);
      return;
    }

    // Use browser's built-in speech recognition (free, no API needed)
    startBrowserRecognition();
  };
  const startBrowserRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: "Not Supported",
        description: "Speech recognition not available in this browser",
        variant: "destructive"
      });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onstart = () => {
      setIsRecording(true);
      setAvatarState('listening');
      toast({
        title: "Listening",
        description: "Speak now..."
      });
    };
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsRecording(false);
      setAvatarState('thinking');
      await sendMessage(transcript);
    };
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      setAvatarState('idle');
      toast({
        title: "Error",
        description: `Speech recognition failed: ${event.error}`,
        variant: "destructive"
      });
    };
    recognition.onend = () => {
      setIsRecording(false);
      if (avatarState === 'listening') setAvatarState('idle');
    };
    recognition.start();
  };
  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;
    const userMessage: Message = {
      role: "user",
      content: textToSend
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setAvatarState('thinking');
    await supabase.from("chat_messages").insert({
      user_id: userId,
      role: "user",
      content: textToSend
    });
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("ai-chat", {
        body: {
          message: textToSend,
          userId
        }
      });
      if (error) throw error;
      const responseText = data.response;
      const assistantMessage: Message = {
        role: "assistant",
        content: responseText
      };
      setMessages(prev => [...prev, assistantMessage]);
      await supabase.from("chat_messages").insert({
        user_id: userId,
        role: "assistant",
        content: responseText
      });
      if (voiceEnabled) {
        speakText(responseText);
      } else {
        setAvatarState('idle');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get response",
        variant: "destructive"
      });
      setAvatarState('idle');
    } finally {
      setLoading(false);
    }
  };
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Load user voice preferences
      const voiceGender = localStorage.getItem(`voice_gender_${userId}`) || "female";
      const speechRate = parseFloat(localStorage.getItem(`speech_rate_${userId}`) || "1.0");
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speechRate;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Get available voices and select based on gender preference
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => {
        const voiceName = voice.name.toLowerCase();
        if (voiceGender === "female") {
          return voiceName.includes('female') || voiceName.includes('woman') || voiceName.includes('google') && !voiceName.includes('male');
        } else {
          return voiceName.includes('male') || voiceName.includes('man');
        }
      });
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      utterance.onstart = () => {
        setCurrentlyPlaying(text);
        setAvatarState('talking');
      };
      utterance.onend = () => {
        setCurrentlyPlaying(null);
        setAvatarState('idle');
      };
      utterance.onerror = () => {
        setCurrentlyPlaying(null);
        setAvatarState('idle');
        toast({
          title: "Speech Error",
          description: "Failed to play voice response",
          variant: "destructive"
        });
      };
      window.speechSynthesis.speak(utterance);
    } else {
      toast({
        title: "Not Supported",
        description: "Text-to-speech not available in this browser",
        variant: "destructive"
      });
    }
  };
  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setCurrentlyPlaying(null);
    setAvatarState('idle');
  };
  return <div className="space-y-4">
      <Card className="p-6 flex items-center gap-4 border-2">
        <div className="relative">
          <Avatar className={`w-24 h-24 transition-all duration-300 avatar-${avatarState}`}>
            <AvatarImage src={aiAvatar || "https://api.dicebear.com/7.x/bottts/svg?seed=ai"} />
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
          {avatarState === 'talking' && <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-pulse pointer-events-none" />}
          {avatarState === 'listening' && <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse pointer-events-none" />}
          {avatarState === 'thinking' && <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 animate-spin-slow pointer-events-none blur-sm" />}
        </div>
        <div>
          <h2 className="text-2xl font-bold">TwinovaAI</h2>
          <p className="text-muted-foreground">
            {avatarState === 'listening' && 'Listening...'}
            {avatarState === 'thinking' && 'Thinking...'}
            {avatarState === 'talking' && 'Speaking...'}
            {avatarState === 'idle' && 'Learning your patterns and helping you grow'}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          {currentlyPlaying && <Button variant="destructive" size="icon" onClick={stopSpeaking} title="Stop Speaking">
              <VolumeX className="w-4 h-4" />
            </Button>}
          <Button variant="outline" size="icon" onClick={() => setVoiceEnabled(!voiceEnabled)} title={voiceEnabled ? "Disable Voice" : "Enable Voice"}>
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        </div>
      </Card>
    <Card className="flex flex-col h-[calc(100vh-16rem)] border-primary/20">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">AI Twin Chat</h3>
        <Button variant="ghost" size="sm" onClick={() => setVoiceEnabled(!voiceEnabled)}>
          {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && <Avatar className="h-8 w-8 border-2 border-primary">
                <AvatarImage src={aiAvatar} alt="AI Twin" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>}
            <div className="flex flex-col gap-2">
              <div className={`rounded-lg p-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {msg.content}
              </div>
              {msg.role === "assistant" && voiceEnabled && <Button variant="ghost" size="sm" onClick={() => speakText(msg.content)} disabled={currentlyPlaying === msg.content} className="self-start">
                  <Volume2 className="h-3 w-3 mr-1" />
                  {currentlyPlaying === msg.content ? "Speaking..." : "Replay"}
                </Button>}
            </div>
          </div>)}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t flex gap-2">
        <Button variant={isRecording ? "destructive" : "secondary"} size="icon" onClick={handleVoiceInput} disabled={loading} title="Click to speak">
          <Mic className={`h-4 w-4 ${isRecording ? 'animate-pulse' : ''}`} />
        </Button>
        <Input value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === "Enter" && !loading && sendMessage()} placeholder="Talk to your AI twin..." disabled={loading || isRecording} />
        <Button onClick={() => sendMessage()} disabled={loading || isRecording}>
          <Send className="h-4 w-4" />
        </Button>
        <SongButton 
          userId={userId} 
          onSongGenerated={(lyrics) => {
            const songMessage: Message = {
              role: 'assistant',
              content: `🎵 Here's a song just for you! 🎵\n\n${lyrics}`
            };
            setMessages(prev => [...prev, songMessage]);
            speakText(lyrics);
          }} 
        />
      </div>
    </Card>
    </div>;
};
export default ChatInterface;