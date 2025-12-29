import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Unit } from "@/hooks/useUnits";
import { UnitWhatsAppIntegration } from "./UnitWhatsAppIntegration";

interface UnitWhatsAppModalProps {
  open: boolean;
  onClose: () => void;
  unit: Unit | null;
  onConnectionChange?: () => void;
}

export function UnitWhatsAppModal({ open, onClose, unit, onConnectionChange }: UnitWhatsAppModalProps) {
  if (!unit) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>WhatsApp - {unit.name}</DialogTitle>
        </DialogHeader>
        <UnitWhatsAppIntegration unit={unit} onConnectionChange={onConnectionChange} />
      </DialogContent>
    </Dialog>
  );
}
