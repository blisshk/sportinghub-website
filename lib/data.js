/** Locale-neutral booking structure and availability sample data. Copy lives in messages/. */
export const BOOKING_DATA = {
  COURTS: [
    {
      id: "vb",
      dia: "volleyball",
    },
    {
      id: "bb",
      dia: "basketball",
    },
    {
      id: "pb",
      dia: "pickleball",
    },
    {
      id: "bd",
      dia: "badminton",
    },
    {
      id: "fb",
      dia: "floorball",
    },
    {
      id: "db",
      dia: "dodgeball",
    },
    {
      id: "tq",
      dia: "teqvoly",
    },
  ],
  CATS: [
    {
      id: "sport",
      kind: "term",
    },
    {
      id: "sc",
      kind: "term",
    },
    {
      id: "cert",
      kind: "event",
    },
    {
      id: "ws",
      kind: "event",
    },
  ],
  CLASSES: [
    {
      id: "c1",
      cat: "sport",
      coach: "Head coach",
      dur: 90,
      spots: 8,
      sport: "vb",
      start: "09:00",
      weekday: 2,
      term: "Nov-Dec",
      lessons: 8,
    },
    {
      id: "c2",
      cat: "sport",
      coach: "Beginner coach",
      dur: 90,
      spots: 3,
      sport: "bd",
      start: "18:00",
      weekday: 4,
      term: "Nov-Dec",
      lessons: 8,
    },
    {
      id: "c3",
      cat: "sc",
      coach: "S&C coach",
      dur: 60,
      spots: 6,
      sport: null,
      start: "07:00",
      weekday: 1,
      term: "Nov-Dec",
      lessons: 12,
    },
    {
      id: "c4",
      cat: "sc",
      coach: "S&C coach",
      dur: 45,
      spots: 10,
      sport: null,
      start: "10:00",
      weekday: 6,
      term: "Nov-Dec",
      lessons: 12,
    },
    {
      id: "c5",
      cat: "cert",
      coach: "Head coach",
      dur: 480,
      spots: 4,
      sport: null,
      start: "09:00",
      date: "2026-11-14",
      end: "17:00",
    },
    {
      id: "w1",
      cat: "ws",
      coach: "Head coach",
      dur: 120,
      spots: 12,
      sport: "vb",
      start: "19:00",
      date: "2026-11-21",
      end: "21:00",
    },
    {
      id: "w2",
      cat: "ws",
      coach: "Beginner coach",
      dur: 90,
      spots: 16,
      sport: "pb",
      start: "19:30",
      date: "2026-11-28",
      end: "21:00",
    },
  ],
  COACHES: [
    {
      id: "marco",
      sport: "vb",
      n: "Head coach",
    },
    {
      id: "ken",
      sport: "sc",
      n: "S&C coach",
    },
    {
      id: "elaine",
      sport: "pb",
      n: "Beginner coach",
    },
    {
      id: "jojo",
      sport: "bd",
      n: "Youth coach",
    },
  ],
  SIZES: [
    {
      id: "1",
    },
    {
      id: "2",
    },
    {
      id: "3",
    },
    {
      id: "4",
    },
    {
      id: "8",
    },
  ],
};
