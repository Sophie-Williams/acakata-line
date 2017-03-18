import uuid from 'uuid';

const initialState = {
  questions: [
    {
      question: 'Ibukota negara Indonesia',
      answer: 'JAKARTA',
      score: 10
    },
    {
      question: 'Masakan khas padang',
      answer: 'RENDANG',
      score: 10
    },
    {
      question: 'Presiden Pertama Indonesia',
      answer: 'SOEHARTO',
      score: 10
    },
    {
      question: 'Kota Pahlawan',
      answer: 'SURABAYA',
      score: 10
    },
  ],
  timer: 5,
  activeQuestion: {
    correctCounter: 0
  },
  rooms: {},
  answers: []
}

export default function questions(state = initialState, action) {
  const {payload} = action;
  switch (action.type) {
    case 'TICK_TIMER':
      return {
        ...state,
        timer: payload.timer,
      };
    case 'CHANGE_ACTIVE_QUESTION':
      return {
        ...state,
        activeQuestion: {
          ...payload.activeQuestion,
          correctCounter: 0
        },
        questionId: uuid.v4(),
        answers: []
      };
    case 'CREATE_ROOM':
      return {
        ...state,
        rooms: state.rooms.hasOwnProperty(payload.roomId) ? state.rooms : {
          ...state.rooms,
          [payload.roomId]: {}
        }
      }
    case 'ANSWER':
      return {
        ...state,
        activeQuestion: {
          ...state.activeQuestion,
          correctCounter: payload.correctCounter
        },
        answers: [
          ...state.answers,
          {
            lineId: payload.user.lineId,
            displayName: payload.user.displayName,
            addedScore: payload.answer.addedScore,
            answerText: payload.answer.text,
            answerState: payload.answer.state
          }
        ],
        rooms: {
          ...state.rooms,
          [payload.user.roomId]: {
            ...state.rooms[payload.user.roomId],
            [payload.user.lineId]: {
              score: payload.user.score
            }
          }
        }
      }
    case 'ADD_USER':
      const updateRoom = {
        ...state.rooms[payload.user.roomId],
        [payload.user.lineId]: {
          lineId: payload.user.lineId,
          replyToken: payload.user.replyToken,
          score: 0,
          displayName: payload.user.displayName
        }
      };
      const newState = {
        ...state,
        rooms: {
          ...state.rooms,
          [payload.user.roomId]: updateRoom
        }
      }
      return newState;
    default:
      return state
  }
}