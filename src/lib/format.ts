const weekdays: Record<string, string> = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche',
}

const eventTypes: Record<string, string> = {
  social: 'Soirée',
  practice: 'Pratique',
  workshop: 'Stage',
  festival: 'Festival',
  competition: 'Compétition',
  open_day: 'Portes ouvertes',
  other: 'Autre',
}

export function formatWeekday(value: string) {
  return weekdays[value] ?? value
}

export function formatEventType(value: string) {
  return eventTypes[value] ?? value
}

export function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Paris',
  }).format(timestamp)
}

export function formatShortDate(timestamp: number) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Paris',
  }).format(timestamp)
}

export function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  }).format(timestamp)
}

export function formatVerifiedDate(timestamp: number | null) {
  if (timestamp === null) return 'Date de vérification indisponible'
  return `Vérifié le ${new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  }).format(timestamp)}`
}
