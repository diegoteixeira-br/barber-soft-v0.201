import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Trash2, Filter, CheckCircle2, DollarSign, AlertTriangle, FileWarning, Phone, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeletionHistory } from "@/hooks/useDeletionHistory";

type PeriodFilter = "7d" | "30d" | "month" | "all";

export function DeletionHistoryTab() {
  const [period, setPeriod] = useState<PeriodFilter>("30d");

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case "7d":
        return { startDate: subDays(now, 7), endDate: now };
      case "30d":
        return { startDate: subDays(now, 30), endDate: now };
      case "month":
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
      case "all":
        return {};
    }
  };

  const { records, isLoading, summary } = useDeletionHistory(getDateRange());

  const getStatusBadge = (status: string) => {
    if (status === "completed") {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Finalizado
        </Badge>
      );
    }
    if (status === "confirmed") {
      return (
        <Badge variant="destructive" className="gap-1 bg-orange-500 hover:bg-orange-500/80">
          <AlertTriangle className="h-3 w-3" />
          Confirmado
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Exclusões</CardDescription>
            <CardTitle className="text-2xl">{summary.totalCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-orange-500" />
              Confirmados Excluídos
            </CardDescription>
            <CardTitle className="text-2xl text-orange-500">{summary.confirmedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <FileWarning className="h-3 w-3 text-destructive" />
              Finalizados Excluídos
            </CardDescription>
            <CardTitle className="text-2xl text-destructive">{summary.completedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Valor Total Excluído
            </CardDescription>
            <CardTitle className="text-2xl">R$ {summary.totalValue.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filtros:</span>
        </div>
        
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
          <SelectTrigger className="w-[150px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data Agendada</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status Original</TableHead>
                <TableHead>Excluído em</TableHead>
                <TableHead>Excluído por</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                      <span className="font-medium text-foreground">Nenhuma exclusão registrada</span>
                      <span className="text-sm">Exclusões de agendamentos confirmados/finalizados aparecerão aqui</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id} className={record.original_status === "completed" ? "bg-destructive/5" : ""}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {format(new Date(record.scheduled_time), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(record.scheduled_time), "HH:mm")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{record.client_name}</span>
                        {record.client_phone && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {record.client_phone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{record.barber_name}</TableCell>
                    <TableCell>{record.service_name}</TableCell>
                    <TableCell className="font-medium">
                      R$ {Number(record.total_price).toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(record.original_status)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>
                          {format(new Date(record.deleted_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(record.deleted_at), "HH:mm")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{record.deleted_by}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm max-w-[200px] truncate block" title={record.deletion_reason}>
                        {record.deletion_reason}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
