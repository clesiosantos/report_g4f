"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LogIn } from "lucide-react";
import { glpiService } from '@/lib/glpi';
import { showSuccess, showError } from '@/utils/toast';

const Login = () => {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userData = await glpiService.login(user, pass);
      localStorage.setItem('glpi_user', JSON.stringify(userData));
      showSuccess(`Bem-vindo, ${userData.name}!`);
      navigate('/dashboard');
    } catch (err) {
      showError("Falha na autenticação com o GLPI.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-blue-600">
        <CardHeader className="space-y-4 flex flex-col items-center pb-8">
          <div className="w-48 h-20 flex items-center justify-center overflow-hidden">
            <img 
              src="https://raw.githubusercontent.com/clesiosantos/glpihmg4f/main/LOGOAZUL.png" 
              alt="Logo RDA" 
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="text-center space-y-1">
            <CardTitle className="text-2xl font-bold text-slate-800">Portal RDA</CardTitle>
            <CardDescription>Entre com suas credenciais do GLPI</CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user">Usuário</Label>
              <Input 
                id="user" 
                placeholder="seu.usuario" 
                value={user}
                onChange={(e) => setUser(e.target.value)}
                required 
                className="focus-visible:ring-blue-600"
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
                className="focus-visible:ring-blue-600"
              />
            </div>
          </CardContent>
          <CardFooter className="pt-4">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 transition-colors" type="submit" disabled={loading}>
              {loading ? "Autenticando..." : (
                <>
                  <LogIn className="mr-2 h-4 w-4" /> Acessar Sistema
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