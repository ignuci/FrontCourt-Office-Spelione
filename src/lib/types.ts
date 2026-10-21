export type Conference = "E" | "W";

export interface Team {
  ab: string;
  city: string;
  name: string;
  conf: Conference;
}
