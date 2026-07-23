const numberFormatter = new Intl.NumberFormat('es-ES');

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatFecha(fecha: string): string {
  const [year, month, day] = fecha.split('-');
  if (!year || !month || !day) return fecha;
  return `${day}/${month}/${year}`;
}

export function formatDateTime(isoLike: string): string {
  // Los timestamps de SQLite vienen como "YYYY-MM-DD HH:MM:SS" en UTC.
  const iso = isoLike.includes('T') ? isoLike : `${isoLike.replace(' ', 'T')}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return isoLike;
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}
