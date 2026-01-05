import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, CheckCircle2 } from "lucide-react";

interface TermAcceptanceModalProps {
  open: boolean;
  term: {
    id: string;
    version: string;
    title: string;
    content: string;
  };
  barberName: string;
  commissionRate: number;
  unitName?: string;
  onAccept: (termId: string, contentSnapshot: string) => Promise<void>;
  isLoading?: boolean;
}

export function TermAcceptanceModal({
  open,
  term,
  barberName,
  commissionRate,
  unitName,
  onAccept,
  isLoading,
}: TermAcceptanceModalProps) {
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Replace dynamic variables in content
  const processedContent = term.content
    .replace(/\{\{nome\}\}/g, barberName)
    .replace(/\{\{comissao\}\}/g, `${commissionRate}%`)
    .replace(/\{\{unidade\}\}/g, unitName || "Unidade");

  // Check scroll position
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
      if (isAtBottom) {
        setHasScrolledToEnd(true);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    
    // Check initial state (if content is short)
    handleScroll();

    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [term.content]);

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      await onAccept(term.id, processedContent);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[90vh] bg-card border-border"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <FileText className="h-5 w-5 text-primary" />
            {term.title}
          </DialogTitle>
          <DialogDescription>
            Versão {term.version} • Leia o documento completo e aceite para continuar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Term Content */}
          <ScrollArea 
            ref={scrollAreaRef}
            className="h-[400px] rounded-lg border border-border bg-secondary/30 p-4"
          >
            <div 
              className="prose prose-sm dark:prose-invert max-w-none text-foreground whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: processedContent.replace(/\n/g, '<br/>') }}
            />
          </ScrollArea>

          {/* Scroll indicator */}
          {!hasScrolledToEnd && (
            <p className="text-sm text-muted-foreground text-center animate-pulse">
              ↓ Role até o final para habilitar o aceite
            </p>
          )}

          {/* Acceptance checkbox */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
            <Checkbox
              id="accept-terms"
              checked={isChecked}
              onCheckedChange={(checked) => setIsChecked(checked === true)}
              disabled={!hasScrolledToEnd}
              className="mt-0.5"
            />
            <label
              htmlFor="accept-terms"
              className={`text-sm cursor-pointer ${
                hasScrolledToEnd ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              Declaro que li, compreendi e concordo com as Normas de Parceria e a 
              porcentagem de <strong>{commissionRate}%</strong> estipulada para minha comissão.
            </label>
          </div>

          {/* Accept button */}
          <Button
            onClick={handleAccept}
            disabled={!hasScrolledToEnd || !isChecked || isSubmitting || isLoading}
            className="w-full gap-2"
            size="lg"
          >
            <CheckCircle2 className="h-5 w-5" />
            {isSubmitting ? "Processando..." : "Assinar Digitalmente e Entrar"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Ao clicar em "Assinar Digitalmente", você concorda que esta assinatura 
            tem validade jurídica. Data e hora serão registradas automaticamente.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}