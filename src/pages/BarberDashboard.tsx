import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBarberAuth } from "@/hooks/useBarberAuth";
import { TermAcceptanceModal } from "@/components/barbers/TermAcceptanceModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, LogOut, Scissors, Calendar, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BarberDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    user,
    barberProfile,
    pendingTerm,
    isLoading,
    isBarber,
    acceptTerm,
    signOut,
  } = useBarberAuth();

  // Redirect if not authenticated or not a barber
  useEffect(() => {
    if (!isLoading && (!user || !isBarber)) {
      navigate("/auth/barber");
    }
  }, [isLoading, user, isBarber, navigate]);

  const handleAcceptTerm = async (termId: string, contentSnapshot: string) => {
    try {
      await acceptTerm(termId, contentSnapshot);
      toast({
        title: "Termo aceito!",
        description: "Você aceitou os termos de parceria com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao aceitar termo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth/barber");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!barberProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">
              Perfil de profissional não encontrado. Entre em contato com o administrador.
            </p>
            <Button onClick={handleSignOut} variant="outline">
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = barberProfile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      {/* Term Acceptance Modal */}
      {pendingTerm && (
        <TermAcceptanceModal
          open={true}
          term={pendingTerm}
          barberName={barberProfile.name}
          commissionRate={barberProfile.commission_rate}
          onAccept={handleAcceptTerm}
        />
      )}

      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Scissors className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold text-foreground">BarberSoft</h1>
                <p className="text-xs text-muted-foreground">Área do Profissional</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={barberProfile.photo_url || undefined} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-foreground">{barberProfile.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Olá, {barberProfile.name.split(" ")[0]}! 👋
          </h2>
          <p className="text-muted-foreground">
            Bem-vindo ao seu painel de controle
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Sua Comissão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">
                {barberProfile.commission_rate}%
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Agendamentos Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">-</p>
              <p className="text-xs text-muted-foreground">Em breve</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Scissors className="h-4 w-4" />
                Serviços Este Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">-</p>
              <p className="text-xs text-muted-foreground">Em breve</p>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <h3 className="font-medium text-foreground mb-2">🚧 Em Desenvolvimento</h3>
            <p className="text-sm text-muted-foreground">
              Esta área está em desenvolvimento. Em breve você poderá visualizar 
              seus agendamentos, comissões e muito mais diretamente por aqui.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}