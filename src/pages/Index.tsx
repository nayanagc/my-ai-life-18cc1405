import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Brain, LogOut, LogIn } from "lucide-react";
import ChatInterface from "@/components/ChatInterface";
import Dashboard from "@/components/Dashboard";
import MoodTracker from "@/components/MoodTracker";
import MoodTrendsChart from "@/components/MoodTrendsChart";
import AvatarSettings from "@/components/AvatarSettings";

const GUEST_ID = "guest-user";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const userId = user?.id ?? GUEST_ID;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b border-border/50 backdrop-blur-sm bg-card/95 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Twinova AI</h1>
          </div>
          {user ? (
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="chat">AI Twin Chat</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="mood">Mood Tracker</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="mt-0">
            <ChatInterface userId={userId} />
          </TabsContent>
          <TabsContent value="dashboard" className="mt-0">
            <Dashboard userId={userId} />
          </TabsContent>
          <TabsContent value="mood" className="mt-0">
            <div className="space-y-6">
              <MoodTracker userId={userId} />
              <MoodTrendsChart userId={userId} />
            </div>
          </TabsContent>
          <TabsContent value="settings" className="mt-0">
            <AvatarSettings userId={userId} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
