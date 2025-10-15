
"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { addDays, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { DateRange } from "react-day-picker"
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"

export function DateRangePicker({
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : addDays(new Date(), -90);
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date();

  const [date, setDate] = React.useState<DateRange | undefined>({ from, to });

  const handleDateSelect = (newDate: DateRange | undefined) => {
    setDate(newDate);
    if (newDate?.from && newDate?.to) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('from', format(newDate.from, 'yyyy-MM-dd'));
      params.set('to', format(newDate.to, 'yyyy-MM-dd'));
      router.push(`${pathname}?${params.toString()}`);
    }
  }
  
  const handlePresetChange = (value: string) => {
      const now = new Date();
      let fromDate: Date | undefined;
      let toDate: Date | undefined = now;

      switch(value) {
          case '7d': fromDate = addDays(now, -7); break;
          case '30d': fromDate = addDays(now, -30); break;
          case '90d': fromDate = addDays(now, -90); break;
      }
      if(fromDate) {
          handleDateSelect({ from: fromDate, to: toDate });
      }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex flex-col sm:flex-row items-center gap-2">
         <Popover>
            <PopoverTrigger asChild>
            <Button
                id="date"
                variant={"outline"}
                className={cn(
                "w-full sm:w-[300px] justify-start text-left font-normal",
                !date && "text-muted-foreground"
                )}
            >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                date.to ? (
                    <>
                    {format(date.from, "LLL dd, y", { locale: ptBR })} -{" "}
                    {format(date.to, "LLL dd, y", { locale: ptBR })}
                    </>
                ) : (
                    format(date.from, "LLL dd, y", { locale: ptBR })
                )
                ) : (
                <span>Escolha um período</span>
                )}
            </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
            <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleDateSelect}
                numberOfMonths={2}
                locale={ptBR}
            />
            </PopoverContent>
        </Popover>
        <Select onValueChange={handlePresetChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Períodos" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
        </Select>
      </div>
    </div>
  )
}
