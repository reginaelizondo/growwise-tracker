import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    // Check if user is already logged in (only on component mount)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Check for cached assessment from guest flow
        const draftData = localStorage.getItem('assessment_draft');
        
        if (draftData) {
          try {
            const draft = JSON.parse(draftData);
            
            // Link the baby to the new user via secure RPC (bypasses RLS safely)
            if (draft.baby_id && draft.assessment_id) {
              const { data: linked, error: linkError } = await supabase.rpc('link_baby_after_signup', {
                baby_uuid: draft.baby_id,
                assessment_uuid: draft.assessment_id,
              });

              if (linkError) {
                console.error("Error linking baby via RPC:", linkError);
                toast({
                  title: "Warning",
                  description: "Account created but couldn't link your assessment. Please contact support.",
                  variant: "destructive",
                });
              } else if (linked) {
                // Clear the draft only if successful and verified
                localStorage.removeItem('assessment_draft');
                toast({
                  title: "Saved!",
                  description: "Your assessment was added to your Dashboard.",
                });
                // Navigate immediately since we've verified the link
                navigate("/dashboard");
                return;
              }
            }
          } catch (err) {
            console.error("Error importing assessment:", err);
          }
        }
        
        toast({
          title: "Account created!",
          description: "Welcome to your baby's development dashboard.",
        });
        
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Check for cached assessment from guest flow (in case they started as guest then signed in)
        const draftData = localStorage.getItem('assessment_draft');
        
        if (draftData) {
          try {
            const draft = JSON.parse(draftData);
            
            // Link the baby to the user via secure RPC
            if (draft.baby_id && draft.assessment_id) {
              const { data: linked, error: linkError } = await supabase.rpc('link_baby_after_signup', {
                baby_uuid: draft.baby_id,
                assessment_uuid: draft.assessment_id,
              });

              if (linkError) {
                console.error("Error linking baby via RPC:", linkError);
              } else if (linked) {
                // Clear the draft only if successful and verified
                localStorage.removeItem('assessment_draft');
                toast({
                  title: "Saved!",
                  description: "Your assessment was added to your Dashboard.",
                });
                // Navigate immediately since we've verified the link
                const redirectTo = (location.state as any)?.from || "/dashboard";
                navigate(redirectTo);
                return;
              }
            }
          } catch (err) {
            console.error("Error importing assessment:", err);
          }
        }
        
        toast({
          title: "Welcome back!",
          description: "Successfully signed in.",
        });
        
        const redirectTo = (location.state as any)?.from || "/dashboard";
        navigate(redirectTo);
      }
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Track Your Baby's Development
          </CardTitle>
          <CardDescription className="text-center">
            Create an account to save your assessment results and monitor progress over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signup" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
              <TabsTrigger value="signin">Sign In</TabsTrigger>
            </TabsList>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullname">Full Name</Label>
                  <Input
                    id="fullname"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
