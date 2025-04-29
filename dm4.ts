import { assign, createActor, setup } from "xstate";
import { Settings, speechstate } from "speechstate";
import { createBrowserInspector } from "@statelyai/inspect";
import { KEY, NLU_KEY} from "./azure";
import { DMContext, DMEvents } from "./types";


const azureLanguageCredentials = {
  endpoint: "https://language-resource-252525-420.cognitiveservices.azure.com/language/:analyze-conversations?api-version=2024-11-15-preview" /** your Azure CLU prediction URL */,
  key: NLU_KEY /** reference to your Azure CLU key */,
  deploymentName: "appointment" /** your Azure CLU deployment */,
  projectName: "appointment" /** your Azure CLU project name */,
};

const inspector = createBrowserInspector();

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: KEY,
};

const settings: Settings = {
  azureLanguageCredentials: azureLanguageCredentials /** global activation of NLU */,
  azureCredentials: azureCredentials,
  azureRegion: "northeurope",
  asrDefaultCompleteTimeout: 0,
  asrDefaultNoInputTimeout: 5000,
  locale: "en-US",
  ttsDefaultVoice: "en-US-DavisNeural",
};


interface GrammarEntry {
  person?: string;
  day?: string;
  time?: string;
  yesno?: boolean;
  info?: string;

};




// Adding celebrity information database to replace part of the grammar
const grammar: { [index: string]: GrammarEntry } = {
  "uma thurman": {info: "Uma Karuna Thurman (born April 29, 1970) is an American actress. She has performed in a variety of films, from romantic comedies and dramas to science fiction and action films."},
  "agatha cristie": {info:"Dame Agatha Mary Clarissa Christie, Lady Mallowan, DBE (née Miller; 15 September 1890 - 12 January 1976) was an English author known for her 66 detective novels and 14 short story collections, particularly those revolving around fictional detectives Hercule Poirot and Miss Marple."},
  "barack obama": {info:"Barack Hussein Obama (born August 4, 1961) is an American politician who was the 44th president of the United States from 2009 to 2017."},
  "stefano mancuso": {info:"Stefano Mancuso (born 9 May 1965) is an Italian botanist and writer, best known for his research on plant intelligence.He is professor of the Agriculture, Food, Environment and Forestry department at his alma mater, the University of Florence."},
  "patty smith": {info:"Patricia Lee Smith (born December 30, 1946) is an American singer, songwriter, poet, painter, author, and photographer."},
  "quentin tarantino": {info:"Quentin Jerome Tarantino (born March 27, 1963) is an American filmmaker, actor, and author. His films are characterized by graphic violence, extended dialogue often featuring much profanity, and references to popular culture."},
  "yes": {yesno:true},
  "yep": {yesno:true},
  "of course": {yesno:true},
  "sure": {yesno:true},
  "no": {yesno:false},
  "nope": {yesno:false},
  "no way": {yesno:false},
  "never": {yesno:false}, 
};

// Function to check if a celebrity exists in our database and get their info
function getCelebrityInfo(utterance: string) {                                                
  return (grammar[utterance.toLowerCase()]|| {}).info;
}

function getConfirm(utterance: string) {
  return (grammar[utterance.toLowerCase()] || {}).yesno;
}







// State machine definition
const dmMachine = setup({

    types: {
        context: {} as DMContext,
        events: {} as DMEvents,
    },

    actions: {
        "spst.speak": ({ context }, params: { utterance: string }) =>
        context.spstRef.send({
            type: "SPEAK",
            value: {
            utterance: params.utterance,
            },
        }),
        "spst.listen": ({ context }) =>
        context.spstRef.send({
            type: "LISTEN",
            value: { nlu: true }
        }),
        // Updated to clear all values including new NLU properties
        clearValues: assign({
        lastResult: null,
        person: null,
        day: null,
        time: null,
        yesno: null,
        appointment: null,
        celebrity: null
        })
    },

}).createMachine({
    context: ({ spawn }) => ({
        spstRef: spawn(speechstate, { input: settings }),
        lastResult: null,
        person: null,
        day: null,
        time: null,
        yesno: null,
        // Initialize new NLU properties
        appointment: null,
        celebrity: null,
    }),
    id: "DM",
    initial: "Prepare",

    states: {

      Prepare: {
        entry: ({ context }) => context.spstRef.send({ type: "PREPARE" }),
        on: { ASRTTS_READY: "WaitToStart" },
      },

      WaitToStart: {
        on: { CLICK: "Greeting" }
      },

      Greeting: {
        entry: {
            type: "spst.speak",
            params: { utterance: `Hi, how can I help you?` },
        },
        on: {
            SPEAK_COMPLETE: "ListenWhatYouNeed",
        },
      },

      ListenWhatYouNeed: {
        entry: {
          type: "spst.listen"
        },
        on: {
          RECOGNISED: [
          {
          guard: ({event}) => event.nluValue.topIntent === "Create a meeting",
          actions: assign({ appointment:true }) 
          },
          {
          guard: ({event}) => event.nluValue.topIntent === "Who is X",
          actions: assign(({ event }) => {
            return { celebrity: getCelebrityInfo(event.nluValue.entities[0])};
          }),
          }],

          LISTEN_COMPLETE: [
            {
              guard: ({ context }) => context.appointment !=null,
              target: "AskPerson"
            }, 
            {
              guard: ({ context }) => context.celebrity !=null,
              target: "CelebrityInfo",
            },
            {
              target: "DontUnderstand"
            }
          ],
          ASR_NOINPUT: {
            actions: assign({ celebrity: null }),
          },
        }
      },

      
      // State for when we don't understand the intent
      DontUnderstand: {
        entry: {
            type: "spst.speak",
            params: { utterance: `I'm sorry, I didn't understand. Could you please try again?` },
        },
        on: {
            SPEAK_COMPLETE: "Greeting",
        },
      },

      // State for providing celebrity information
      CelebrityInfo: {
        entry: {
            type: "spst.speak",
            params: ({ context }) => ({ 
            utterance: `${context.celebrity}` 
            }),
        },
        on: {
            SPEAK_COMPLETE: "Prepare",
        },
      },

      // Appointment flow states
      AskPerson: {
        entry: {
            type: 'spst.speak',
            params: { utterance: `Who are you meeting with?`}
        },
        on: {
            SPEAK_COMPLETE: 'ListenPerson',
        },
      },

      ListenPerson: {
        entry: { type: "spst.listen" },
          on: {
            RECOGNISED:{
              actions:
              assign({person: ({event}) => event.nluValue.entities[0]
              }),
            },
            LISTEN_COMPLETE: [
              {
              guard: ({ context }) => context.day!=null,
              target: "AskDay",
              },
              {
                target: "AskPerson"}
            ],
            ASR_NOINPUT: {
              actions: assign({ day: null }),
            },
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

      ListenDay:{
        entry: { 
          type: "spst.listen" 
        },
        on: {
          RECOGNISED: {
            actions: assign({day: ({event}) => 
              event.nluValue.entities[0].text
          }),
          },
          LISTEN_COMPLETE: [
            {
            guard: ({ context }) => context.day != null,
            target: "AskFullDay",
            },
            {target: "AskDay"}
          ],
          ASR_NOINPUT: {
            actions: assign({ day: null }),
          },
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
        entry: { type: "spst.listen" },
            on: {
              RECOGNISED: {
                actions:
                assign({time: ({event}) => event.nluValue.entities[0].text
                }),
            },
            LISTEN_COMPLETE: [
              {
              guard: ({ context }) => context.time!=null,
              target: "ConfirmAppointment",
              },
              {target: "AskTime"}
            ],
            ASR_NOINPUT: {
              actions: assign({ time: null }),
            },
          },
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
              target: "Prepare",
            },
            {
              // If it's not confirmed from the speaker
              guard: ({ context }) =>
                getConfirm(context.lastResult![0].utterance) === false,
              target: "Prepare",
            },
            { target: "Prepare" }, // else go to greeting
          ],
        },
        exit: { type: "clearValues" }, // clear context
      },


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