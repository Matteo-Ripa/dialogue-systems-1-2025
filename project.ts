import { assign, createActor, log, setup } from "xstate";
import { Settings, speechstate } from "speechstate";
import { createBrowserInspector } from "@statelyai/inspect";
import { KEY } from "./azure";
import { DMContext, DMEvents } from "./types";
import Sentiment from 'sentiment';

// Create a Sentiment analyzer instance
const sentiment = new Sentiment();

function getSentimentScore(utterance: string): number {
  const result = sentiment.analyze(utterance);
  return result.score;
}


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

interface GrammarEntry {
  player?: string;
  day?: string;
  time?: string;
  yesno?: boolean;
  preferenceWork?: string;
  sport?: string;
  sport_player?: null;
}


const grammar: { [index: string]: GrammarEntry } = {
  "yes": {yesno:true},
  "yep": {yesno:true},
  "of course": {yesno:true},
  "sure": {yesno:true},
  "why not": {yesno:true},
  "no": {yesno:false},
  "nope": {yesno:false},
  "no way": {yesno:false},
  "never": {yesno:false}, 
  "Absolutely": {yesno:true},
  "Definitely": {yesno:true},
  "Of course": {yesno:true},
  "Sure thing": {yesno:true},
  "For sure": {yesno:true},
  "You bet": {yesno:true},
  "Sounds good": {yesno:true},
  "I agree": {yesno:true},
  "Indeed": {yesno:true},
  "That works for me": {yesno:true},
  "I’m on board": {yesno:true},
  "Certainly": {yesno:true},
  "That’s correct": {yesno:true},
  "Exactly": {yesno:true},
  "I’m in": {yesno:true},
  "in group": {preferenceWork: "group"},
  "group": {preferenceWork: "group"},
  "individually": {preferenceWork: "individually"},
};

function getConfirm(utterance: string) {
  return (grammar[utterance.toLowerCase()] || {}).yesno;
}

function getWorkMode(utterance: string) {
  return (grammar[utterance.toLowerCase()] || {}).preferenceWork;
}
/*
####################################################################################################
####################################################################################################
####################################################################################################
*/


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
      }),
    
    clearValues: assign({
      lastResult: null,
      player: null,
      yesno: null,
      feeling: 0,
      sport: null,
      sport_player: null,
      Friend_or_Protest: null,
      timeProtest: null,
      timePlayer: null,
    })
  },
  
}).createMachine({
  context: ({ spawn }) => ({
    spstRef: spawn(speechstate, { input: settings }),   
    lastResult: null,
    player: null,
    yesno: null,
    name_ver1: null,
    person1: 'Zod',
    person2: 'Vic',
    preferenceWork: null,
    feeling: 0,
    sport: null,
    sport_player: null,
    Friend_or_Protest: null,
    timeProtest: '16',
    timePlayer: null,

  }),
  id: "DM",
  initial: "Prepare",

  states: {

    Prepare: {  
      entry: ({ context }) => context.spstRef.send({ type: "PREPARE" }), // prepares the speech recognitio system
      on: { ASRTTS_READY: "WaitToStart" },  // transition to 'WaitToStart'
    },

    WaitToStart: {
      on: { CLICK: "Start" }
    },

    Start: {
      entry: {
        type: "spst.speak",
        params: { 
          utterance: 
          `Hi, it's time to start the game. First, I have to register few things.` 
        },
      },
      on: { 
        SPEAK_COMPLETE: "AskName"
      },
    },

    AskName: {
      entry: {
        type: "spst.speak",
        params: { 
          utterance: 
          `Say the name of the player!` 
        },
      },
      on: { 
        SPEAK_COMPLETE: "ListenName"
      },
    },

    ListenName: {
      entry: {
        type: 'spst.listen',
      },
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => { return {player : event.value[0].utterance}
          }),
        },
        LISTEN_COMPLETE: [
          {
            guard: ({context}) => context.player != null,
            target: 'CheckName'
          },
          {
            target: 'AskName'
          },
        ],
        ASR_NOINPUT: {
          actions: assign({ lastResult: null}),
        },
      }
    },
    
    CheckName: {
      entry: {
        type: 'spst.speak',
        params: ({ context }) => ({
          utterance:  `Ok ${context.player}, let's start the game.`
        }),
      },
      on: {
        SPEAK_COMPLETE: [
          {
            guard: ({ context }) => context.player != null,
            target: 'FindManifestation',            
          },
          {
            target: 'AskName',
          },
        ],
      },
    },
    
    /*
    let's start the story of the game
    */

    FindManifestation: {
      entry: {
        type: 'spst.speak',
        params: { 
          utterance: 
          `It is a sunny day, you are walking in the city centre. Suddenly, on the parallel of your street you notice a big crowd walking and screaming slogans. So, you decide to go closer.`
        }
      },
      on : {
        SPEAK_COMPLETE: 'AsktoJoin',
      },
    },

    AsktoJoin: {
      entry: {
        type: 'spst.speak',
        params: { 
          utterance: 
          `Do you want to join?`}
      },
      on : {
        SPEAK_COMPLETE: 'ListenJoin',
      },
    },

    ListenJoin:{
      entry: {
        type: 'spst.listen',
      },
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => {
            return {yesno: getConfirm(event.value[0].utterance)}; 
          }),
        },
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.yesno != null,
            target: 'CheckJoin',
          },
          {
            target: 'AsktoJoin'
          },
        ],
        ASR_NOINPUT: {
          actions: assign({ lastResult: null}),
        },
      },
    },

    CheckJoin: {
      entry: {
        type: "spst.speak",
        params: ({ context }) => {
          if (context.yesno === true) {
            return { utterance: "Ok, let's join the manifestation!" };
          } else {
            return { utterance: "Ok, maybe it's not the time now." };
          }
        },
      },
      on: {
        SPEAK_COMPLETE: [
          {
            guard: ({ context }) => context.yesno === true,
            target: "JoinManifestation",
          },
          {
            guard: ({ context }) => context.yesno === false,
            target: "HowDoYouFeel",
          },
          {
            target: "AsktoJoin", 
          },
        ],
      },
      exit: assign({yesno: null}),
    },

    JoinManifestation: {
      entry: {
        type: 'spst.speak',
        params: { 
          utterance: 
          `The manifestation is very crowd. You start to walk through all the people, reading slogans, hearing screams, and people act very excited.
          At some point, from afar you see a person. You don't know them, but it seems they want you to come closer.`
        }
      },
      on : {
        SPEAK_COMPLETE: 'AskGo',
      },
    },

    AskGo: {
      entry: {
        type: 'spst.speak',
        params: { 
          utterance: 
          `Do you want to go and talk with the stranger?`}
      },
      on : {
        SPEAK_COMPLETE: 'ListenGo',
      },
    },

    ListenGo: {
      entry: {
        type: 'spst.listen',
      },
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => {return {yesno: getConfirm(event.value[0].utterance)}; 
        }),
        },
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.yesno != null,
            target: 'CheckGo',
          },
          {
            target: 'AskGo'
          },
        ],
        ASR_NOINPUT: {
          actions: assign({ lastResult: null }),
        },
      },
    },

    CheckGo: {
      entry: {
        type: "spst.speak",
        params: ({ context }) => {
          if (context.yesno === true) {
            return { utterance: "They start smile to you and gesture to go closer." };
          } else {
            return { utterance: "Still walking in manifestation alone." };
          }
        },
      },
      on: {
        SPEAK_COMPLETE: [
          {
            guard: ({ context }) => context.yesno === true,
            target: "StartDialogue_1",
          },
          {
            guard: ({ context }) => context.yesno === false,
            target: "StillWalk"
          },
          {
            target: "AskGo", 
          },
        ],
      },
      exit: assign({yesno: null}),
    },

    StartDialogue_1: {
      entry: {
        type: 'spst.speak',
        params: { 
          utterance: 
          `Hi, what is your name?`
        }
      },
      on : {
        SPEAK_COMPLETE: 'ListenAgainName',
      },
    },

    ListenAgainName: {
      entry: {
        type: 'spst.listen',
      },
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => { return {name_ver1:event.value[0].utterance};
          }),
        },
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.name_ver1 != null,
            target: 'FollowDialogue_1',
          },
          {
            target: 'WaitToStart'
          },
        ],
        ASR_NOINPUT: {
          actions: assign({ lastResult: null }),
        },
      },
    },

    FollowDialogue_1: {
      entry: {
        type: 'spst.speak',
        params: ({context}) => ({ 
          utterance: 
          `Hi ${context.name_ver1}, my name is ${context.person1}, I'm here with some friends for the manifestation.`
        }),
      },
      on : {
        SPEAK_COMPLETE: 'AskWalkWithThem',
      },
    },

    AskWalkWithThem: {
      entry: {
        type: 'spst.speak',
        params: { 
          utterance: 
          `Do you want to walk with us?`
        }
      },
      on : {
        SPEAK_COMPLETE: 'ListenWalkWithThem',
      },
    },

    ListenWalkWithThem: {
      entry: {
        type: 'spst.listen',
      },
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => { 
            return {yesno: getConfirm(event.value[0].utterance)};
          }),
        },
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.yesno != null,
            target: 'CheckWalkWithThem',
          },
          {
            target: "AskWalkWithThem" 
          },
        ],
        ASR_NOINPUT: {
          actions: assign({ lastResult: null }),
        },
      },
    },

    CheckWalkWithThem:{
      entry: {
        type: "spst.speak",
        params: ({ context }) => {
          if (context.yesno === true) {
            return { utterance: "Great, I´m glad to hear that, I show you my friends." };
          } else {
            return { utterance: "You leave the person." };
          }
        },
      },
      on: {
        SPEAK_COMPLETE: [
          {
            guard: ({ context }) => context.yesno === true,
            target: "StartDialogue_2",
          },
          {
            guard: ({ context }) => context.yesno === false,
            target: "StillWalk"
          },
          {
            target: "AskWalkWithThem", 
          },
        ],
      },
      exit: assign({yesno: null}),
    },

    StartDialogue_2: {
      entry: {
        type: 'spst.speak',
        params: ({context}) => ({ 
          utterance: 
          `Hi , my name is ${context.person2}. We are a group of people that enjoy the time together; we meet one time a week and we discuss about politic topics.`
        }),
      },
      on : {
        SPEAK_COMPLETE: 'AskDialogue_2',
      },
    },

    AskDialogue_2: {
      entry: {
        type: 'spst.speak',
        params: { 
          utterance: 
          `Do you like to work in group or individually more?`
        },
      },
      on : {
        SPEAK_COMPLETE: 'ListenAnswer_2',
      },
    },

    ListenAnswer_2: {
      entry: {
        type: 'spst.listen',
      },
      on: {
        RECOGNISED: {          
          actions: assign(({ event }) => { 
            console.log(event.value[0].utterance);
            return {preferenceWork:getWorkMode(event.value[0].utterance)
            };
          
          }),
        },
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.preferenceWork != null,
            target: 'CheckAnswer_2',
          },
          {
            target: "AskDialogue_2" 
          },
        ],
        ASR_NOINPUT: {
          actions: assign({ lastResult: null }),
        },
      },
    },

    CheckAnswer_2:{
      entry: {
        type: "spst.speak",
        params: ({ context }) => {
          if (context.preferenceWork === 'group') {
            return { utterance: "Come with us, we would like to go in a quiter place." };
          } else {
            return { utterance: "I understand that. I would like to talk with you more but we have to leave. Have a good day!" };
          }
        },
      },
      on: {
        SPEAK_COMPLETE: [
          {
            guard: ({ context }) => context.preferenceWork === 'group',
            target: "StartDialogue_3",
          },
          {
            guard: ({ context }) => context.preferenceWork === 'individually',
            target: "StillWalk" 
          },
          {
            target: "AskDialogue_2" 
          },
        ],
      },
      exit: assign({yesno: null}),
    },

    StartDialogue_3: {
      entry: {
        type: "spst.speak",
        params: ({ context }) => ({ 
          utterance: 
          `Now we are going to meet our leader for a meeting; 
          on Monday at ${context.timeProtest} we want to participate to another protest, but closer to the parlament. 
          You are more than welcome to come.`
        }),
      },
      on: { 
        SPEAK_COMPLETE: "AskDialogue_3" 
      },
    },

    AskDialogue_3: {
      entry: {
        type: "spst.speak",
        params: { 
          utterance: 
          `Do you accept?` 
        },
      },
      on: { 
        SPEAK_COMPLETE: "ListenDialogue_3" 
      },
    },

    ListenDialogue_3: {
      entry: {
        type: 'spst.listen',
      },
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => {return {yesno: getConfirm(event.value[0].utterance)}; 
        }),
        },
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.yesno != null,
            target: 'CheckDialogue_3',
          },
          {
            target: 'AskDialogue_3'
          },
        ],
        ASR_NOINPUT: {
          actions: assign({ lastResult: null }),
        },
      },
    },

    CheckDialogue_3: {
      entry: {
        type: "spst.speak",
        params: ({ context }) => {
          if (context.yesno === true) {
            return { utterance: "You leave the group and start to go home, but first you decide to stop in a caffe to rest a bit." };
          } else {
            return { utterance: "Go home, maybe another time." };
          }
        },
      },
      on: {
        SPEAK_COMPLETE: [
          {
            guard: ({ context }) => context.yesno === true,
            target: "AskSport",
          },
          {
            guard: ({ context }) => context.yesno === false,
            target: "Prepare"
          },
          {
            target: "AskDialogue_3", 
          },
        ],
      },
      exit: assign({yesno: null}),
    },

    AskSport: {
      entry: {
        type: "spst.speak",
        params: { 
          utterance: 
          `After a while, a person comes and sit at the same table. They start to conversate with you.
          At some point they ask: What is your favourite sport?` 
        },
      },
      on: { 
        SPEAK_COMPLETE: "ListenSport"
      },
    },

    ListenSport: {
      entry: {
        type: 'spst.listen',
      },
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => { return {sport : event.value[0].utterance}
          }),
        },
        LISTEN_COMPLETE: [
          {
            guard: ({context}) => context.player != null,
            target: 'CheckSport'
          },
          {
            target: 'AskSport'
          },
        ],
        ASR_NOINPUT: {
          actions: assign({ lastResult: null}),
        },
      }
    },

    CheckSport: {
      entry: {
        type: 'spst.speak',
        params: ({ context }) => ({
          utterance:  `I love ${context.sport} as well. 
          Who is your favourite player?`
        }),
      },
      on: {
        SPEAK_COMPLETE: [
          {
            guard: ({ context }) => context.player != null,
            target: 'ListenSportPLayer',            
          },
          {
            target: 'AskSport',
          },
        ],
      },
    }, 

    ListenSportPLayer: {
      entry: {
        type: 'spst.listen',
      },
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => { return {sport_player : event.value[0].utterance}
          }),
        },
        LISTEN_COMPLETE: [
          {
            guard: ({context}) => context.sport_player != null,
            target: 'CheckSportPlayer'
          },
          {
            target: 'CheckSport'
          },
        ],
        ASR_NOINPUT: {
          actions: assign({ lastResult: null}),
        },
      }
    },

    CheckSportPlayer: {
      entry: {
        type: 'spst.speak',
        params: ({ context }) => ({
          utterance:  `I think ${context.sport_player} is a great person, their contribute in ${context.sport} is very important.`
        }),
      },
      on: {
        SPEAK_COMPLETE: [
          {
            guard: ({ context }) => context.player != null,
            target: 'AskMeetAgain',            
          },
          {
            target: 'CheckSport',
          },
        ],
      },
    }, 

    AskMeetAgain: {
      entry: {
        type: 'spst.speak',
        params: { 
          utterance: 
          `Now I have to leave sorry, do you want to meet here again on Monday afternoon?`}
      },
      on : {
        SPEAK_COMPLETE: 'ListenMeetAgain',
      },
    },

    ListenMeetAgain:{
      entry: {
        type: 'spst.listen',
      },
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => {
            return {yesno: getConfirm(event.value[0].utterance)}; 
          }),
        },
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.yesno != null,
            target: 'CheckMeetAgain',
          },
          {
            target: 'AskMeetAgain'
          },
        ],
        ASR_NOINPUT: {
          actions: assign({ lastResult: null}),
        },
      },
    },

    CheckMeetAgain: {
      entry: {
        type: "spst.speak",
        params: ({ context }) => {
          if (context.yesno === true) {
            return { utterance: "In this way you will skip the protest, but you will have a new friend." };
          } else {
            return { utterance: "Ok, I understand that!" };
          }
        },
      },
      on: {
        SPEAK_COMPLETE: [
          {
            guard: ({ context }) => context.yesno === true,
            target: "AskFriend_or_Protest",
          },
          {
            guard: ({ context }) => context.yesno === false,
            target: "AskWhyBusy",
          },
          {
            target: "AskMeetAgain", 
          },
        ],
      },
      exit: assign({yesno: null}),
    },

    AskFriend_or_Protest: {
      entry: {
        type: 'spst.speak',
        params: { 
          utterance: 
          `What do you decide: friend or protest?`}
      },
      on : {
        SPEAK_COMPLETE: 'ListenFriend_or_Protest',
      },
    },

    ListenFriend_or_Protest: {
      entry: {
        type: 'spst.listen',
      },
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => {
            return {Friend_or_Protest: event.value[0].utterance}; 
          }),
        },
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.Friend_or_Protest != null,
            target: 'CheckFriend_or_Protest',
          },
          {
            target: 'AskFriend_or_Protest',
          },
        ],
        ASR_NOINPUT: {
          actions: assign({ lastResult: null}),
        },
      },
    },

    CheckFriend_or_Protest: {
      entry: {
        type: "spst.speak",
        params: ({ context }) => {
          if (context.Friend_or_Protest === 'Friend') {
            return { utterance: "You decided to meet the new friend. But the next Monday, going back to the caffe, you don't find anyone, they lied to you." };
          } else {
            return { utterance: "Ok, I understand that!" };
          }
        },
      },
      on: {
        SPEAK_COMPLETE: [
          {
            guard: ({ context }) => context.Friend_or_Protest === 'Friend',
            target: "Prepare",
          },
          {
            guard: ({ context }) => context.Friend_or_Protest === 'Protest',
            target: "AskWhyBusy",
          },
          {
            target: "AskFriend_or_Protest", 
          },
        ],
      },
    },

    AskWhyBusy: {
      entry: {
        type: "spst.speak",
        params: { 
          utterance: 
          `They ask you the reason of why you are busy. Do you want to tell them?` 
        },
      },
      on: { 
        SPEAK_COMPLETE: "ListenWhyBusy"
      },
    },

    ListenWhyBusy: {
      entry: {
        type: 'spst.listen',
      },
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => {
            return {yesno: getConfirm(event.value[0].utterance)}; 
          }),
        },
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.yesno != null,
            target: 'CheckWhyBusy',
          },
          {
            target: 'AskWhyBusy'
          },
        ],
        ASR_NOINPUT: {
          actions: assign({ lastResult: null}),
        },
      },
    },

    CheckWhyBusy: {
      entry: {
        type: "spst.speak",
        params: ({ context }) => {
          if (context.yesno === true) {
            return { utterance: "Ok, let's join the manifestation!" };
          } else {
            return { utterance: "Ok, maybe it's not the time now." };
          }
        },
      },
      on: {
        SPEAK_COMPLETE: [
          {
            guard: ({ context }) => context.yesno === true,
            target: "LeaveCaffeYes",
          },
          {
            guard: ({ context }) => context.yesno === false,
            target: "LeaveCaffeNo",
          },
          {
            target: "AskWhyBusy", 
          },
        ],
      },
    },

    LeaveCaffeYes: {
      entry: {
        type: "spst.speak",
        params: { 
          utterance: 
          `After you exlpained the reason, you say goodbye and decide to go home and rest.` 
        },
      },
      on: { 
        SPEAK_COMPLETE: "AskTimeMonday"
      },
    },

    LeaveCaffeNo: {
      entry: {
        type: "spst.speak",
        params: { 
          utterance: 
          `You decided to don't explain why, you say goodbye and go home to rest.` 
        },
      },
      on: { 
        SPEAK_COMPLETE: "AskTimeMonday"
      },
    },

    AskTimeMonday: {
      entry: {
        type: "spst.speak",
        params: { 
          utterance: 
          `It's Monday, you wake up, prepare breakfast and get ready for the day. 
          But you might have forgotten the time for the protest. At what time is the manifestation planned? ` 
        },
      },
      on: { 
        SPEAK_COMPLETE: "ListenTimeMonday"
      },
    },

    ListenTimeMonday: {
      entry: {
        type: 'spst.listen',
      },
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => { return {timePlayer : event.value[0].utterance}
          }),
        },
        LISTEN_COMPLETE: [
          {
            guard: ({context}) => context.timePlayer != null,
            target: 'CheckTimePlayer'
          },
          {
            target: 'AskTimeMonday'
          },
        ],
        ASR_NOINPUT: {
          actions: assign({ lastResult: null}),
        },
      }
    },
    
    CheckTimePlayer: {
      entry: {
        type: "spst.speak",
        params: ({ context }) => {
          if (context.timePlayer === context.timeProtest) {
            return { utterance: "You remembered right, let's go!" };
          } 
          else {
            return { utterance: "Unfortunately you missed the protest. Game over." };
          }
        },
      },
      on: {
        SPEAK_COMPLETE: [
          {
            guard: ({ context }) => context.timePlayer === context.timeProtest,
            target: "CheckNameMatch",
          },
          {
            guard: ({ context }) => context.timePlayer != context.timeProtest,
            target: "Prepare",
          },
          {
            target: "AskTimeMonday", 
          },
        ],
      },
    },

    CheckNameMatch: {
      entry: {
        type: "spst.speak",
        params: ({ context }) => {
          if (context.yesno === false) {
            return { utterance: "You leave home and go to the protest. You are ready to take over the parlament." };
          } 
          else {
            return { utterance: "You leave home, but outside you notice something strange..." };
          }
        },
      },
      on: {
        SPEAK_COMPLETE: [
          {
            guard: ({ context }) => context.yesno === true,
            target: "Kidnapped",
          },
          {
            guard: ({ context }) => context.yesno === false,
            target: "Prepare",
          },
          {
            target: "AskTimeMonday", 
          },
        ],
      },
      exit: assign({yesno: null}),
    },

    Kidnapped: {
      entry: {
        type: "spst.speak",
        params: { 
          utterance: 
          `On the way to the protest you get kidnapped from the people you have met.
          They tell you that you spread information about the protest to a cop undercover in a caffe.
          You are kicked out from the group!` 
        },
      },
      on: { 
        SPEAK_COMPLETE: "Prepare"
      },
    },
/*
##############################################################################################################
##############################################################################################################
##############################################################################################################
*/

    HowDoYouFeel: {
      entry: {
        type: 'spst.speak',
        params: { 
          utterance: 
          `How do you feel?`}
      },
      on : {
        SPEAK_COMPLETE: 'ListenIfeel'
      },
    },

    ListenIfeel: {
      entry: {
        type: 'spst.listen',
      },
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => {
            console.log(event.value[0].utterance)
            return {feeling: getSentimentScore(event.value[0].utterance)}; 
          }),
        },
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.feeling != null,
            target: 'CheckIfeel',
          },
          {
            target: 'HowDoYouFeel'
          },
        ],
        ASR_NOINPUT: {
          actions: assign({ lastResult: null}),
        },
      },
    },

    CheckIfeel: {
      entry: {
        type: "spst.speak",
        params: ({ context }) => {
          console.log(context.feeling);
          if (context.feeling > 0) {
            return { utterance: "Ok, let's play a bit more!" };
          } else {
            return { utterance: "It's okay, it's better to rest sometimes. You can play another time." };
          }
        },
      },
      on: {
        SPEAK_COMPLETE: [
          {
            guard: ({ context }) => context.feeling > 0,
            target: "AskPlayAgain",
          },
          {
            guard: ({ context }) => context.feeling < 0,
            target: "GoHome",
          },
          {
            target: "HowDoYouFeel",
          },
        ],
      },
      //exit: assign({yesno: null}),
    },

    GoHome: {
      entry: {
        type: 'spst.speak',
        params: { 
          utterance: 
          `Ok, sometimes it's better to rest. Go home!`}
      },
      on : {
        SPEAK_COMPLETE: 'Prepare'
      },
    },

    AskPlayAgain: {
      entry: {
        type: 'spst.speak',
        params: { 
          utterance: 
          `I'm glad to hear that. Do you want to play again?`}
      },
      on : {
        SPEAK_COMPLETE: 'ListenPlayAgain'
      },
    },

    ListenPlayAgain: {
      entry: {
        type: 'spst.listen',
      },
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => {
            return {yesno: getConfirm(event.value[0].utterance)}; 
          }),
        },
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.feeling != null,
            target: 'CheckPlayAgain',
          },
          {
            target: 'AskPlayAgain'
          },
        ],
        ASR_NOINPUT: {
          actions: assign({ lastResult: null}),
        },
      },
    },

    CheckPlayAgain: {
      entry: {
        type: "spst.speak",
        params: ({ context }) => {
          if (context.yesno === true) {
            return { utterance: "Let's play again"};
          } else {
            return { utterance: "Game Over" };
          }
        },
      },
      on: {
        SPEAK_COMPLETE: [
          {
            guard: ({ context }) => context.yesno === true,
            target: "Start",
          },
          {
            guard: ({ context }) => context.yesno === false,
            target: "Prepare",
          },
          {
            target: "AskPlayAgain", 
          },
        ],
      },
      exit: assign({yesno: null}),
    },

/*
##############################################################################################################
##############################################################################################################
##############################################################################################################
*/

    StillWalk: {
      entry: {
        type: 'spst.speak',
        params: { 
          utterance: 
          `After crossing some streets, you manage to arrive close to a park where the situation is less crowed. 
          At some point you see a group of people sat in circle on the grass.
          They look very relaxed, drinking beers and smoking.`
        }
      },
      on : {
        SPEAK_COMPLETE: 'AskMeetCirclePeople',
      },
    },

    AskMeetCirclePeople: {
      entry: {
        type: 'spst.speak',
        params: { 
          utterance: 
          `Might it be a good idea to go closer and start to chat with them?`
        }
      },
      on : {
        SPEAK_COMPLETE: 'ListenMeetCirclePeople',
      },
    },

    ListenMeetCirclePeople: {
      entry: {
        type: 'spst.listen',
      },
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => {return {yesno: getConfirm(event.value[0].utterance)}; 
        }),
        },
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.yesno != null,
            target: 'CheckMeetCirclePeople',
          },
          {
            target: 'AskMeetCirclePeople'
          },
        ],
        ASR_NOINPUT: {
          actions: assign({ lastResult: null }),
        },
      },
    },

    CheckMeetCirclePeople: {
      entry: {
        type: "spst.speak",
        params: ({ context }) => {
          if (context.yesno === true) {
            return { utterance: "Go closer and start to talk with them." };
          } else {
            return { utterance: "Maybe today you don't feel keen to socialize, going home and rest it's the best choice, other days and opportunities will come." };
          }
        },
      },
      on: {
        SPEAK_COMPLETE: [
          {
            guard: ({ context }) => context.yesno === true,
            target: "AskJoinBeer",
          },
          {
            guard: ({ context }) => context.yesno === false,
            target: "Prepare"
          },
          {
            target: "AskMeetCirclePeople", 
          },
        ],
      },
      exit: assign({yesno: null}),
    },

    AskJoinBeer: {
      entry: {
        type: "spst.speak",
        params: { 
          utterance: 
          `They offer you a beer, do you accept?` 
        },
      },
      on: { 
        SPEAK_COMPLETE: "ListenJoinBeer"
      },
    },

    ListenJoinBeer: {
      entry: {
        type: 'spst.listen',
      },
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => {
            return {yesno: getConfirm(event.value[0].utterance)}; 
          }),
        },
        LISTEN_COMPLETE: [
          {
            guard: ({ context }) => context.yesno != null,
            target: 'CheckJoinBeer',
          },
          {
            target: 'AskJoinBeer'
          },
        ],
        ASR_NOINPUT: {
          actions: assign({ lastResult: null}),
        },
      },
    },

    CheckJoinBeer: {
      entry: {
        type: "spst.speak",
        params: ({ context }) => {
          if (context.yesno === true) {
            return { utterance: "You accept the beer." };
          } else {
            return { utterance: "You refuse the beer, but they tell that they would be happy to know you better." };
          }
        },
      },
      on: {
        SPEAK_COMPLETE: [
          {
            guard: ({ context }) => context.yesno === true,
            target: "EndPeopleBeer",
          },
          {
            guard: ({ context }) => context.yesno === false,
            target: "EndPeopleBeer",
          },
          {
            target: "AskJoinBeer", 
          },
        ],
      },
      exit: assign({yesno: null}),
    },

    EndPeopleBeer: {
      entry: {
        type: "spst.speak",
        params: { 
          utterance: 
          `You sit wiht them, enjoying the chats, and spend the rest of your day there.
          After few hours you are tired and decide to go home.` 
        },
      },
      on: { 
        SPEAK_COMPLETE: "Prepare"
      },
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
  console.log("button")
  element.addEventListener("click", () => {
    dmActor.send({ type: "CLICK" });
    element.style.display="none";
  });
}
