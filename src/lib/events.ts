export const EVENT_TYPES = {
  milestone: {
    label: "Milestone",
    icon: "🎉",
  },

  equipment: {
    label: "Equipment",
    icon: "🚴",
  },

  studio: {
    label: "Studio",
    icon: "🏢",
  },

  fitness: {
    label: "Fitness",
    icon: "💪",
  },

  travel: {
    label: "Travel",
    icon: "✈️",
  },

  health: {
    label: "Health",
    icon: "❤️",
  },

  other: {
    label: "Other",
    icon: "●",
  },
} as const;

export type EventType = keyof typeof EVENT_TYPES;

export function getEventType(type: string) {
  return EVENT_TYPES[type as EventType] ?? EVENT_TYPES.other;
}