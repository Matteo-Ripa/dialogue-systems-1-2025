import { Hypothesis, SpeechStateExternalEvent } from "speechstate";
import { AnyActorRef } from "xstate";

export interface DMContext {
  spstRef: AnyActorRef;
  lastResult: Hypothesis[] | null;
  person: string | null;
  day: string | null;
  yesno: boolean | null;
  time: string | null;
}

export type DMEvents = SpeechStateExternalEvent | { type: "CLICK" };
