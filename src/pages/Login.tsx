"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LogIn } from "lucide-react";
import { glpiService } from '@/lib/glpi';
import { showSuccess, showError } from '@/utils/toast';
import { useAuth } from '@/contexts/AuthContext';

const Login = () => {
  const [userStr, setUserStr] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      const from = (location.state as any)?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userData = await glpiService.login(userStr, pass);
      login(userData);
      showSuccess(`Bem-vindo, ${userData.name}!`);
    } catch (err) {
      showError("Falha na autenticação (Reduc).");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-green-600">
        <CardHeader className="space-y-4 flex flex-col items-center pb-8">
          <div className="w-48 h-20 flex items-center justify-center overflow-hidden">
            {/* Logo da Petrobras Reduc */}
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Petrobras_logo.svg/1280px-Petrobras_logo.svg.png" 
              alt="Logo Reduc" 
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="text-center space-y-1">
            <CardTitle className="text-2xl font-bold text-slate-800">Portal RDA - Reduc</CardTitle>
            <CardDescription>Acesse com suas credenciais do GLPI Reduc</CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user">Usuário</Label>
              <Input 
                id="user" 
                placeholder="seu.usuario" 
                value={userStr}
                onChange={(e) => setUserStr(e.target.value)}
                required 
                className="focus-visible:ring-green-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pass">Senha</Label>
              <Input 
                id="pass" 
                type="password" 
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required 
                className="focus-visible:ring-green-600"
              />
            </div>
          </CardContent>
          <CardFooter className="pt-4">
            <Button className="w-full bg-green-700 hover:bg-green-800 transition-colors" type="submit" disabled={loading}>
              {loading ? "Autenticando..." : (
                <>
                  <LogIn className="mr-2 h-4 w-4" /> Acessar Reduc
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Login;