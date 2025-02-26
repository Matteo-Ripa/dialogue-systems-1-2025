/*
Imports:

xstate: This line imports functions (assign, createActor, and setup) from the xstate library, which is used for 
creating and managing state machines. State machines are a way to model different states of your application and
the transitions between them.

speechstate: This imports Settings and speechstate from a custom speechstate module.

@statelyai/inspect: This imports createBrowserInspector from @statelyai/inspect. This is a tool used for 
inspecting and debugging XState state machines in a browser environment.

./azure: This imports KEY from a local file named azure.ts. This KEY is an API key for Azure Cognitive 
Services, which will be used for speech recognition and synthesis.

./types: This imports DMContext and DMEvents from a local file named types.ts. These define the TypeScript 
types for the context (data) and events used in the state machine.
*/

import { assign, createActor, setup } from "xstate";
import { Settings, speechstate } from "speechstate";
import { createBrowserInspector } from "@statelyai/inspect";
import { KEY } from "./azure";
import { DMContext, DMEvents } from "./types";



/*
This section configures the settings for the ASR/TTS system, including the Azure endpoint, 
API key, region, timeouts, locale, and voice. These settings are passed to the speechstate module.
*/

// const inspector = createBrowserInspector();: 
// This line creates an instance of the browser inspector, which will help you visualize and debug the state machine.
const inspector = createBrowserInspector();

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: KEY,
};

const settings: Settings = {
  azureCredentials: azureCredentials,
  azureRegion: "northeurope",
  asrDefaultCompleteTimeout: 0,
  asrDefaultNoInputTimeout: 5000,
  locale: "en-US",
  ttsDefaultVoice: "en-US-DavisNeural",
};

/*
####################################################################################################
####################################################################################################
####################################################################################################
*/


/*
GrammarEntry interface: 
This defines an interface called GrammarEntry in TypeScript. 
An interface is a way to define the "shape" of an object. In this case, a GrammarEntry can have optional 
properties person, day, and time, all of which are strings. 
The ? after each property name indicates that the property is optional.
*/

interface GrammarEntry {
  person?: string;
  day?: string;
  time?: string;
  yesno?: boolean
}


/*
grammar object: 
This creates a constant object named grammar. This object is a dictionary (or a map) where:

Keys: are strings (e.g., "vlad", "monday", "8").

Values: are GrammarEntry objects. Each key represents a word or phrase, and its corresponding value 
contains information about what that word/phrase represents (e.g., a person's name, a day of the week, a time).


[index: string] : defines the type of the key 'index', so a string type
*/

const grammar: { [index: string]: GrammarEntry } = {
  vlad: { person: "Vladislav Maraev" },
  aya: { person: "Nayat Astaiza Soriano" },
  victoria: { person: "Victoria Daniilidou" },
  matteo: { person: "Matteo Ripamonti"},
  lou: { person: "Lou Reed"},
  david: {person: "David Bowie"},
  monday: { day: "Monday" },
  tuesday: { day: "Tuesday" },
  wednesday: { day: "Wednesday" },
  thursday: { day: "Thursday" },
  friday: { day: "Friday" },
  saturday: { day: "Saturday" },
  sunday: { day: "Sunday" },
  "8": { time: "8:00" },
  "9": { time: "9:00" },
  "10": { time: "10:00" },
  "11": { time: "11:00" },
  "12": { time: "12:00" },
  "13": { time: "13:00" },
  "14": { time: "14:00" },
  "15": { time: "15:00" },
  "16": { time: "16:00" },
  "17": { time: "17:00" },
  "18": { time: "18:00" },
  "19": { time: "19:00" },
  "20": { time: "20:00" },
  "yes": {yesno:true},
  "yep": {yesno:true},
  "of course": {yesno:true},
  "sure": {yesno:true},
  "no": {yesno:false},
  "nope": {yesno:false},
  "no way": {yesno:false},
  "never": {yesno:false}, 
};



/*
isInGrammar function: This function checks if a given utterance (user input) exists as a key in the 
grammar object (case-insensitive). 
It returns true if the utterance is in the grammar, and false otherwise.
*/

function isInGrammar(utterance: string) {
  return utterance.toLowerCase() in grammar;
}


/*
getPerson Function:

This function also takes a string utterance as input.

grammar[utterance.toLowerCase()]: This attempts to access the grammar object using the lowercase version 
of the utterance as the key. If the key exists, it returns the corresponding GrammarEntry object. If the 
key does not exist, it returns undefined.

|| {}: This is the "or" operator. If grammar[utterance.toLowerCase()] is undefined (meaning the utterance 
is not in the grammar), then the expression evaluates to an empty object {}. This is a way to avoid errors 
when trying to access properties of undefined.

.person: This attempts to access the person property of the GrammarEntry object (or the empty object if the 
utterance wasn't in the grammar). If the person property exists, its value (a string) is returned. If the 
person property does not exist (or if the utterance wasn't in the grammar, and we're looking at the empty 
object), then undefined is returned.
*/

// || : 'or' operator 
// .person : access to person property from the grammar object
function getPerson(utterance: string) {
  return (grammar[utterance.toLowerCase()] || {}).person;
}

function getNumber(utterance: string) {
  return (grammar[utterance.toLowerCase()] || {}).day;
}

function getFullDay(utterance: string) {
  return (grammar[utterance.toLowerCase()] || {}).yesno;
}

function getTime(utterance: string) {
  return (grammar[utterance.toLowerCase()] || {}).time;
}

function getConfirm(utterance: string) {
  return (grammar[utterance.toLowerCase()] || {}).yesno;
}
/*
####################################################################################################
####################################################################################################
####################################################################################################
*/


/*
setup({ ... }): 
This function from xstate is used to configure the state machine. 
*/
const dmMachine = setup({

  // types: { context: {} as DMContext, events: {} as DMEvents }: 
  // Specifies the TypeScript types for the state machine's context and events. This helps with type 
  // checking and prevents errors.
  types: {
    /** you might need to extend these */
    /*
    context: {} as DMContext: 
    Defines the type of the context object for the state machine, casting an empty object to the 
    DMContext type (imported from ./types). The context holds the data that the state machine uses and updates. 
    Based on the types.ts file, the DMContext interface contains the spstRef property, which is a reference 
    to the speechstate actor, and the lastResult property, which stores the result of the last speech recognition.

    events: {} as DMEvents: 
    Defines the type of the events that the state machine can react to, casting an empty object to the DMEvents 
    type (imported from ./types). The DMEvents type includes SpeechStateExternalEvent and CLICK event.
    */
    context: {} as DMContext,
    events: {} as DMEvents,
  },

  // actions: 
  // This section defines reusable actions that can be performed within the state machine. Actions are functions 
  // that execute when a state is entered or when a transition occurs.
  actions: {  
    /** define your actions here */

    // "spst.speak": 
    // This action sends a 'SPEAK' event to the 'speechstate' actor (spstRef). It takes a 'params' object with an 
    // 'utterance' property, which is the text to be spoken.
    "spst.speak": ({ context }, params: { utterance: string }) =>
      context.spstRef.send({
        type: "SPEAK",
        value: {
          utterance: params.utterance,
        },
      }),

    // "spst.listen": 
    // This action sends a 'LISTEN' event to the 'speechstate' actor, telling it to start listening for speech input.
    "spst.listen": ({ context }) =>
      context.spstRef.send({
        type: "LISTEN",
      }),
    
    clearValues: assign({
      lastResult: null,
      person: null,
      day: null,
      time: null,
      yesno: null
    })
  },
  
// .createMachine({ ... }): 
// This function from 'xstate' creates the state machine. It takes an object that defines the machine's 
// configuration, including its context, initial state, and states.
}).createMachine({
  // context: 
  // This defines the initial context of the state machine. The context is like the "memory" of the state machine; 
  // it holds data that can be accessed and updated by the states and transitions.
  context: ({ spawn }) => ({

    // spstRef: spawn(speechstate, { input: settings }): Spawns an actor (an independent, running instance) 
    // from the speechstate module. The settings object (containing Azure credentials and other configurations) is 
    // passed as input to the speechstate actor. This establishes the link between the dialog manager and 
    // the ASR/TTS system.
    spstRef: spawn(speechstate, { input: settings }),   // 'spawn' calls the module 'speechstate'. The 'speechstate' module is 
                                                        // hidden and we don't have to know what happens there.

    // lastResult: null: Initializes the 'lastResult' property to null. This property will store the result of the 
    // most recent speech recognition attempt.
    lastResult: null,
    person: null,
    day: null,
    time: null,
    yesno: null
  }),
  // id: "DM": Assigns the ID "DM" to the state machine.
  id: "DM",
  // initial: "Prepare": Sets the initial state of the machine to "Prepare". This means that when the machine 
  // starts, it will automatically enter the "Prepare" state.
  initial: "Prepare",

  // states: This object defines the different states of the state machine and the transitions between them. 
  // Each key in this object represents a state name (e.g., "Prepare", "WaitToStart", "Greeting"). Each state 
  // has properties like entry (actions to perform when entering the state) and on (transitions to other states 
  // based on events).
  states: {
    Prepare: {  // name of the state
      // entry: ({ context }) => context.spstRef.send({ type: "PREPARE" }): When the machine enters the "Prepare" 
      // state, it sends a PREPARE event to the speechstate actor (spstRef). This likely tells the speechstate 
      // module to initialize its speech recognition and synthesis systems.
      entry: ({ context }) => context.spstRef.send({ type: "PREPARE" }), // prepares the speech recognitio system
      // on: { ASRTTS_READY: "WaitToStart" }: When the machine receives an ASRTTS_READY event, it transitions to 
      // the "WaitToStart" state. This event likely comes from the speechstate actor, indicating that it has 
      // finished initializing.
      on: { ASRTTS_READY: "WaitToStart" },  // transition to 'WaitToStart'
    },

    WaitToStart: {
      // on: { CLICK: "Greeting" }: When the machine receives a CLICK event, it transitions to the "Greeting" 
      // state. This suggests that the user needs to click something to start the interaction.
      on: { CLICK: "Greeting" }
    },


    Greeting: {
      // Define the "Greeting" state
      entry: {
        type: "spst.speak",
        params: { utterance: `Hi, let's create an appointment` },
      },
      // When entering this state, speak a greeting message
      on: { 
        SPEAK_COMPLETE: "AskPerson"//"AskFullDay" ,
      },
      // When the speaking is complete, transition to the "AskPerson" state
    },

    AskPerson: {
      entry: {
        type: 'spst.speak',
        params: { utterance: `Who are you meeting with?`}
      },
      on : {
        SPEAK_COMPLETE: 'ListenPerson',
      },
    },

    ListenPerson: {
      entry: {
        type: "spst.listen"
      },
      on: {
        // if it recognised...
        RECOGNISED: {
          actions: assign(({ event }) => {
            // call the function 'getPerson', and assign to the variable 'person' the person who you want meet
            const person= getPerson(event.value[0].utterance);
            // it return either the values updated, or just the last result
            return person ? {person, lastResult: event.value} : {lastResult: event.value};
          }),
        },
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.person != null,
            target: 'CheckPerson',
          },
          {
            target: 'AskPerson'
          },
        ],
        // else...
        ASR_NOINPUT: {
          actions: assign({ lastResult: null}),
        },
      },
    },

    CheckPerson: {
      entry: {
        type: 'spst.speak',
        params: ({ context }) => ({
          utterance: context.person != null ? `You will meet ${context.person}.` : `I didn't understand the person's name.`
        }),
      },
      on: {
        SPEAK_COMPLETE: [
          {
            guard: ({ context }) => context.person != null,
            target: 'AskDay',            
          },
          {
            target: 'AskPerson',
          },
        ],
      },
    },

    AskDay: {
      entry: {
        type: 'spst.speak',
        params: { utterance: `Which day do you want the meeting?`}
      },
      on : {
        SPEAK_COMPLETE: 'ListenDay'
      },
    },

    ListenDay: {
      entry: {
        type: 'spst.listen'
      },
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => {
            const day= getNumber(event.value[0].utterance);
            return day ? {day, lastResult: event.value} : {lastResult: event.value};
          }),
        },
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => !!context.day != null,
            target: 'CheckDay',
          },
          {
            target: 'AskDay'
          },
        ],
        ASR_NOINPUT: {
          actions: assign({ lastResult: null}),
        },
      },
    },

    CheckDay: {
      entry: {
        type: 'spst.speak',
        params: ({ context }) => ({
          utterance: context.day ?  `The day will be ${context.day}.`: `I did't understand the day`
        }),
      },
      on: {
        SPEAK_COMPLETE: [
          {
            guard: ({ context }) => !!context.day,
            target: 'AskFullDay',
          },
          {
            target: 'AskDay'
          }
        ]        
      },
    },

    AskFullDay: {
      entry: {
        type: 'spst.speak',
        params: {
          utterance: 'Will it take the whole day?'
        },
      },
      on: {
        SPEAK_COMPLETE: 'ListenFullDay'
      },
    },


    ListenFullDay: {
      entry: { type: "spst.listen" },
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => {
            const confirmation = getConfirm(event.value[0].utterance);
            return confirmation !== undefined
              ? { yesno: confirmation, lastResult: event.value }
              : { lastResult: event.value };
          }),
        },
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.yesno !== undefined,
            target: "CheckFullDay",
          },
          {
            target: "AskFullDay", 
          },
        ],
        ASR_NOINPUT: {
          actions: assign({ lastResult: null }),
          target: "AskFullDay", 
        },
      },
    },
    
    CheckFullDay: {
      entry: {
        type: "spst.speak",
        params: ({ context }) => {
          if (context.yesno === true) {
            return { utterance: "Ok, you will take the whole day." };
          } else {
            return { utterance: "Ok, the meeting will not be the whole day." };
          }
        },
      },
      on: {
        SPEAK_COMPLETE: [
          {
            guard: ({ context }) => context.yesno === true,
            target: "ConfirmAppointment",
          },
          {
            guard: ({ context }) => context.yesno === false,
            target: "AskTime",
          },
          {
            target: "AskFullDay", 
          },
        ],
      },
    },

    AskTime: {
      entry: {
        type: 'spst.speak',
        params: {
          utterance: 'What time is your meeting?'
        },
      },
      on: {
        SPEAK_COMPLETE: 'ListenTime'
      }
    },

    ListenTime: {
      entry: {
        type: 'spst.listen'
      },
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => {
            const time= getTime(event.value[0].utterance);
            return time ? {time, lastResult: event.value} : {lastResult: event.value};
          }),
        },
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => !!context.time != null,
            target: 'CheckTime',
          },
          {
            target: 'AskTime'
          },
        ],
        ASR_NOINPUT: {
          actions: assign({ lastResult: null}),
          },
      },
    },

    CheckTime: {
      entry: {
        type: 'spst.speak',
        params: ({ context }) => ({
          utterance: context.time != null ? `You will meet at ${context.time}.` : `I did not understand the time.`,
        }),
      },
      on : {
        SPEAK_COMPLETE: [
          {
            guard: ({ context }) => !!context.time,
            target: 'ConfirmAppointment',
          },
          {
            target: 'AskTime'
          }
        ]
      }
    },

    ConfirmAppointment: {
      entry: {
        type: "spst.speak",
        params: ({ context }) => {
          let UttConfirm = `Do you want me to create an appointment with ${context.person} `;
          UttConfirm += `on ${context.day} `;

          if (context.yesno === true) {
            UttConfirm += `for the whole day?`;
          } else {
            UttConfirm += `at ${context.time}?`;
          }
          return { utterance: UttConfirm };
        },
      },
      on: {
        SPEAK_COMPLETE: 'ListenConfirm'
      }
    },

    ListenConfirm: {
      entry: { type: "spst.listen" },
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => {
            const confirmation = getConfirm(event.value[0].utterance);
            return confirmation !== undefined
              ? { lastResult: event.value } : { lastResult: event.value };
          }),
        },
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => !!context.yesno != null,
            target: 'CheckConfirmation',
          },
          {
            target: 'ConfirmAppointment'
          },
        ],
        ASR_NOINPUT: {
          actions: assign({ lastResult: null }),
          target: "ConfirmAppointment", // If no input, ask again
        },
      },
    },

    CheckConfirmation: {
      entry: {
        type: "spst.speak",
        params: ({ context }) => {
          const confirmation = getConfirm(context.lastResult![0].utterance);
          if (confirmation === true) {
            return { utterance: "Your appointment has been created!" };
          } 
          else if (confirmation === false) {
            // If the user rejected the appointment
            return { utterance: "Okay, let's start over." };
            // Return a message indicating that the process will start over
          } 
          else {
            // If the confirmation was not understood
            return { utterance: "I didn't understand. Let's start over." };
            // Start over :( 
          }
        },
      },
      on: {
        SPEAK_COMPLETE: [
          {
            // If it's confirmed
            guard: ({ context }) =>
              getConfirm(context.lastResult![0].utterance) === true,
            target: "Greeting",
          },
          {
            // If it's not confirmed from the speaker
            guard: ({ context }) =>
              getConfirm(context.lastResult![0].utterance) === false,
            target: "Greeting",
          },
          { target: "Greeting" }, // else go to greeting
        ],
      },
      exit: { type: "clearValues" }, // clear context
    },

    // on: { CLICK: "Greeting" }: When the user clicks again, the machine transitions back to the "Greeting" 
    // state, restarting the interaction.
    Done: {
      on: {
        CLICK: "Greeting",
      },
    },

    "new state 1": {}
  },
});

const dmActor = createActor(dmMachine, {
  inspect: inspector.inspect,
}).start();

dmActor.subscribe((state) => {
  console.group("State update");
  console.log("State value:", state.value);
  console.log("State context:", state.context);
  console.groupEnd();
});

export function setupButton(element: HTMLButtonElement) {
  element.addEventListener("click", () => {
    dmActor.send({ type: "CLICK" });
  });
  dmActor.subscribe((snapshot) => {
    const meta: { view?: string } = Object.values(
      snapshot.context.spstRef.getSnapshot().getMeta(),
    )[0] || {
      view: undefined,
    };
    element.innerHTML = `${meta.view}`;
  });
}
