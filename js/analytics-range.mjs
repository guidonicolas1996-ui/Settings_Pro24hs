function normalizePreset(preset = 'today') {
  return String(preset || 'today').toLowerCase();
}

export function createAnalyticsRange(preset = 'today', now = new Date()) {
  const currentDate = now instanceof Date ? new Date(now) : new Date(now);
  const start = new Date(currentDate);
  const end = new Date(currentDate);

  switch (normalizePreset(preset)) {
    case 'current-hour': {
      start.setMinutes(0, 0, 0);
      end.setMinutes(59, 59, 999);
      return { start, end, label: 'Hora actual' };
    }
    case 'current-shift': {
      const currentHour = currentDate.getHours();
      const shiftStartHour = currentHour < 8 ? 0 : currentHour < 16 ? 8 : 16;
      start.setHours(shiftStartHour, 0, 0, 0);
      end.setHours(shiftStartHour + 7, 59, 59, 999);
      return { start, end, label: 'Turno actual' };
    }
    case 'yesterday': {
      start.setDate(currentDate.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(currentDate.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'Ayer' };
    }
    case 'last-24h': {
      start.setHours(currentDate.getHours() - 24);
      return { start, end, label: 'Últimas 24 horas' };
    }
    case 'week': {
      const day = currentDate.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(currentDate.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'Esta semana' };
    }
    case 'month': {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(currentDate.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'Este mes' };
    }
    case 'year': {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'Este año' };
    }
    case 'all': {
      start.setTime(0);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'Todo el tiempo' };
    }
    default: {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'Hoy' };
    }
  }
}
