import { Hypothesis, SpeechStateExternalEvent } from "speechstate";
import { AnyActorRef } from "xstate";

export interface DMContext {
  spstRef: AnyActorRef;
  lastResult: Hypothesis[] | null;
  player: string | null;
  yesno: boolean | null;

  // for the project
  name_ver1: string | null;
  person1: string;
  person2: string;
  preferenceWork: string | null;
  feeling: number;
  sport: string | null;
  sport_player: string | null;
  Friend_or_Protest: string | null;
  timeProtest: string | null;
  timePlayer: string | null;
}
export type DMEvents = SpeechStateExternalEvent | { type: "CLICK" };
