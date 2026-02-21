import { AudioUIState, AudioAction } from '@/types/audio';

// Re-export AudioAction for backward compatibility with existing imports
export type { AudioAction };

export const initialAudioUIState: AudioUIState = {
  playerState: 'off',
  speed: 1.0,
  hasListened: false,
  savedTime: 0,
  snippetId: null,
  isSpeedExpanded: false,
};

export function audioReducer(state: AudioUIState, action: AudioAction): AudioUIState {
  switch (action.type) {
    case 'SET_PLAYER_STATE':
      return { ...state, playerState: action.payload };

    case 'SET_SPEED':
      return { ...state, speed: action.payload };

    case 'MARK_LISTENED':
      return { ...state, hasListened: true, savedTime: 0, playerState: 'off' };

    case 'RESTORE_POSITION':
      return {
        ...state,
        savedTime: action.payload.savedTime,
        hasListened: action.payload.hasListened,
        speed: action.payload.speed ?? state.speed,
      };

    case 'TOGGLE_SPEED_PANEL':
      return { ...state, isSpeedExpanded: !state.isSpeedExpanded };

    case 'LOAD_SNIPPET':
      return {
        ...state,
        snippetId: action.payload,
        playerState: 'full',
        hasListened: false,
        isSpeedExpanded: false,
      };

    case 'DISMISS':
      return {
        ...state,
        playerState: 'off',
        isSpeedExpanded: false,
      };

    case 'DISMISS_PLAYER':
      return {
        ...state,
        playerState: 'off',
        isSpeedExpanded: false,
      };

    case 'MINIMIZE_PLAYER':
      return {
        ...state,
        playerState: 'mini',
        isSpeedExpanded: false,
      };

    case 'NAVIGATE_TO_SNIPPET':
      // Does not change playerState -- the reading screen handles transition to 'full' on mount
      return state;

    default:
      return state;
  }
}
