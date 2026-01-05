import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Eye,
  Trash2,
  Users,
  Info
} from "lucide-react";
import { usePartnershipTerms, useTermAcceptances } from "@/hooks/usePartnershipTerms";
import { useCompany } from "@/hooks/useCompany";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DEFAULT_TERM_TEMPLATE = `TERMOS DE PARCERIA E NORMAS DE CONDUTA

1. DAS PARTES
Este termo estabelece as normas de parceria entre o estabelecimento e o Profissional Parceiro {{nome}}.

2. DA REMUNERAÇÃO
O Profissional Parceiro receberá a cota-parte de {{comissao}} sobre os serviços prestados, conforme acordado previamente.

3. DAS OBRIGAÇÕES
O Profissional se compromete a:
- Manter pontualidade nos atendimentos agendados
- Seguir os padrões de qualidade do estabelecimento
- Zelar pela imagem e reputação da empresa
- Utilizar apenas produtos fornecidos ou aprovados

4. DA POLÍTICA DE CANCELAMENTO
- Faltas sem aviso prévio (no-show) podem resultar em desconto na remuneração
- Cancelamentos tardios devem ser comunicados com antecedência mínima

5. DA CONFIDENCIALIDADE (LGPD)
O Profissional não poderá exportar ou utilizar a lista de clientes do sistema para contato por fora do estabelecimento. O descumprimento configura desvio de clientela e é motivo para rescisão imediata.

6. DA VIGÊNCIA
Este termo entra em vigor na data de aceite digital e permanece válido enquanto a parceria estiver ativa.

Unidade: {{unidade}}`;

export function PartnershipTermsTab() {
  const { company } = useCompany();
  const { terms, activeTerm, isLoading, createTerm, activateTerm, deleteTerm } = usePartnershipTerms(company?.id || null);
  const { acceptances } = useTermAcceptances(company?.id || null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showAcceptancesModal, setShowAcceptancesModal] = useState(false);
  const [previewTerm, setPreviewTerm] = useState<typeof terms[0] | null>(null);

  const [newVersion, setNewVersion] = useState("");
  const [newTitle, setNewTitle] = useState("Termos de Parceria e Normas de Conduta");
  const [newContent, setNewContent] = useState(DEFAULT_TERM_TEMPLATE);

  const handleCreate = async () => {
    if (!company || !newVersion || !newTitle || !newContent) return;

    await createTerm.mutateAsync({
      company_id: company.id,
      version: newVersion,
      title: newTitle,
      content: newContent,
      is_active: false,
    });

    setShowCreateModal(false);
    setNewVersion("");
    setNewTitle("Termos de Parceria e Normas de Conduta");
    setNewContent(DEFAULT_TERM_TEMPLATE);
  };

  const handlePreview = (term: typeof terms[0]) => {
    setPreviewTerm(term);
    setShowPreviewModal(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Termos de Parceria
              </CardTitle>
              <CardDescription>
                Gerencie os termos que os profissionais devem aceitar ao acessar o sistema
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowAcceptancesModal(true)}
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                Ver Aceites
              </Button>
              <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Versão
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground mb-1">Como funciona</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Crie versões do termo com as regras da sua barbearia</li>
                <li>• Use variáveis: <code className="bg-secondary px-1 rounded">{"{{nome}}"}</code>, <code className="bg-secondary px-1 rounded">{"{{comissao}}"}</code>, <code className="bg-secondary px-1 rounded">{"{{unidade}}"}</code></li>
                <li>• Ative uma versão para que apareça no login dos profissionais</li>
                <li>• Quando ativar uma nova versão, todos precisarão aceitar novamente</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terms List */}
      <div className="grid gap-4">
        {terms.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-foreground mb-2">Nenhum termo cadastrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie seu primeiro termo de parceria para proteger sua empresa
              </p>
              <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Primeiro Termo
              </Button>
            </CardContent>
          </Card>
        ) : (
          terms.map((term) => (
            <Card key={term.id} className={`bg-card border-border ${term.is_active ? 'ring-2 ring-primary' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground">{term.title}</h4>
                        <Badge variant="outline">v{term.version}</Badge>
                        {term.is_active && (
                          <Badge className="bg-success text-success-foreground">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Ativo
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Criado em {format(new Date(term.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handlePreview(term)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    {!term.is_active && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => activateTerm.mutate(term.id)}
                          disabled={activateTerm.isPending}
                        >
                          Ativar
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover termo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O termo será removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteTerm.mutate(term.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] bg-card">
          <DialogHeader>
            <DialogTitle>Nova Versão do Termo</DialogTitle>
            <DialogDescription>
              Crie uma nova versão do termo de parceria. Use as variáveis para personalização.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Versão *</Label>
                <Input
                  placeholder="Ex: 1.0, 2.0"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  placeholder="Título do termo"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Conteúdo do Termo *</Label>
              <Textarea
                placeholder="Digite o conteúdo do termo..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Variáveis disponíveis: {"{{nome}}"}, {"{{comissao}}"}, {"{{unidade}}"}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreate}
                disabled={!newVersion || !newTitle || !newContent || createTerm.isPending}
              >
                {createTerm.isPending ? "Criando..." : "Criar Termo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] bg-card">
          <DialogHeader>
            <DialogTitle>{previewTerm?.title}</DialogTitle>
            <DialogDescription>Versão {previewTerm?.version}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] rounded-lg border p-4">
            <div className="whitespace-pre-wrap text-sm">
              {previewTerm?.content}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Acceptances Modal */}
      <Dialog open={showAcceptancesModal} onOpenChange={setShowAcceptancesModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] bg-card">
          <DialogHeader>
            <DialogTitle>Registro de Aceites</DialogTitle>
            <DialogDescription>
              Histórico de aceites dos termos pelos profissionais
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            {acceptances.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum aceite registrado ainda
              </div>
            ) : (
              <div className="space-y-3">
                {acceptances.map((acceptance: any) => (
                  <Card key={acceptance.id} className="bg-secondary/30">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {acceptance.barbers?.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {acceptance.partnership_terms?.title} v{acceptance.partnership_terms?.version}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-foreground">
                            {format(new Date(acceptance.accepted_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                          <p className="text-muted-foreground">
                            Comissão: {acceptance.commission_rate_snapshot}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}