import { Hypothesis, SpeechStateExternalEvent } from "speechstate";
import { AnyActorRef } from "xstate";

export interface DMContext {
  spstRef: AnyActorRef;
  lastResult: Hypothesis[] | null;
  day: string | null;
  yesno: boolean | null;
  time: string | null;
  person: string | null;
  
  // New properties for NLU integration
  appointment: boolean | null;   // Stores the recognized intent from Azure NLU
  celebrity: string | null | boolean; // Stores the celebrity name for "who is X" intent
}
export type DMEvents = SpeechStateExternalEvent | { type: "CLICK" };
