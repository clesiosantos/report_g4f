// Competencia Tec: mes de inicio, do dia 20 ao dia 19 do mes seguinte.
export function getPeriodDates(period: string): string[] {
  const months = ['JANEIRO','FEVEREIRO','MARCO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
  const normalized = period.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const match = /^(\d{4})\s*-\s*([A-Z]+)$/.exec(normalized);
  if (!match) return [];
  const year = Number(match[1]);
  const month = months.indexOf(match[2]);
  if (month < 0 || year < 1000 || year > 9998) return [];
  const start = new Date(Date.UTC(year, month, 20));
  const end = Date.UTC(year, month + 1, 19);
  const dates: string[] = [];
  for (const day = new Date(start); day.getTime() <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    dates.push(day.toISOString().slice(0, 10));
  }
  return dates;
}
