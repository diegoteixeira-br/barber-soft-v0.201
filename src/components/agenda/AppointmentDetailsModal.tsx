import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Phone, User, Scissors, Clock, DollarSign, Calendar, Edit, Trash2, CheckCircle, XCircle, Cake } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { StatusBadge, getNextStatus } from "./StatusBadge";
import type { Appointment } from "@/hooks/useAppointments";
import type { Database } from "@/integrations/supabase/types";

type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];

interface AppointmentDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: AppointmentStatus) => void;
  isLoading?: boolean;
}

export function AppointmentDetailsModal({
  open,
  onOpenChange,
  appointment,
  onEdit,
  onDelete,
  onStatusChange,
  isLoading,
}: AppointmentDetailsModalProps) {
  if (!appointment) return null;

  const startTime = new Date(appointment.start_time);
  const endTime = new Date(appointment.end_time);
  const barberColor = appointment.barber?.calendar_color || "#FF6B00";
  const nextStatus = getNextStatus(appointment.status);

  const getNextStatusLabel = (status: AppointmentStatus) => {
    switch (status) {
      case "confirmed":
        return "Confirmar";
      case "completed":
        return "Finalizar";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-12 rounded-full"
              style={{ backgroundColor: barberColor }}
            />
            <div>
              <DialogTitle className="text-xl">{appointment.client_name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {format(startTime, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <StatusBadge status={appointment.status} />
            <span className="text-lg font-bold text-primary">
              R$ {Number(appointment.total_price).toFixed(2)}
            </span>
          </div>

          <Separator />

          <div className="grid gap-3">
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
              </span>
            </div>

            {appointment.client_phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{appointment.client_phone}</span>
              </div>
            )}

            {appointment.client_birth_date && (
              <div className="flex items-center gap-3 text-sm">
                <Cake className="h-4 w-4 text-muted-foreground" />
                <span>{appointment.client_birth_date.split('-').reverse().join('/')}</span>
              </div>
            )}

            {appointment.barber && (
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: barberColor }}
                  />
                  {appointment.barber.name}
                </div>
              </div>
            )}

            {appointment.service && (
              <div className="flex items-center gap-3 text-sm">
                <Scissors className="h-4 w-4 text-muted-foreground" />
                <span>
                  {appointment.service.name} ({appointment.service.duration_minutes} min)
                </span>
              </div>
            )}

            {appointment.notes && (
              <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">{appointment.notes}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Status change buttons */}
          {appointment.status !== "completed" && appointment.status !== "cancelled" && (
            <div className="flex gap-2">
              {nextStatus && (
                <Button
                  className="flex-1"
                  onClick={() => onStatusChange(nextStatus)}
                  disabled={isLoading}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {getNextStatusLabel(nextStatus)}
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={() => onStatusChange("cancelled")}
                disabled={isLoading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-between pt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O agendamento será removido permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
