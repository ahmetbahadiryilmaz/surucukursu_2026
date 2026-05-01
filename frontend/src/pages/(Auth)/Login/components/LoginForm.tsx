import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import LoginFormInputs from "./LoginFormInputs"; 
import LoginFormFooter from "./LoginFormFooter";
import { useLoginLogic, useSessionCheck } from "../hooks";

export default function LoginForm() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Custom hooks
  const { handleLogin } = useLoginLogic();
  useSessionCheck();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await handleLogin({ email, password });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">MTSK Yönetim Sistemi</CardTitle>
          <CardDescription>Hesabınıza giriş yapın</CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <div className="mb-4 p-3 text-sm text-red-600 bg-red-100 rounded-md border border-red-300">
              {error}
            </div>
          )}
    
          <LoginFormInputs
            email={email}
            password={password}
            isLoading={isLoading}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onSubmit={handleSubmit}
          />
          
          <LoginFormFooter />
        </CardContent>
      </Card>
    </div>
  );
}
