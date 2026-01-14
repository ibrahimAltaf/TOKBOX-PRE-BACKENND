export type ClientToServerEvents = {
  "room:join": (payload: { roomId: string }, cb?: (res: any) => void) => void;
  "room:leave": (payload: { roomId: string }, cb?: (res: any) => void) => void;

  "msg:send": (
    payload: {
      roomId: string;
      text?: string;
      mediaUrls?: string[];
      mediaIds?: string[];
    },
    cb?: (res: any) => void
  ) => void;

  "dm:open": (
    payload: { targetSessionId: string },
    cb?: (res: any) => void
  ) => void;

  "dm:send": (
    payload: {
      threadId: string;
      text?: string;
      mediaUrls?: string[];
      mediaIds?: string[];
    },
    cb?: (res: any) => void
  ) => void;

  "typing:start": (
    payload: { roomId: string },
    cb?: (res: any) => void
  ) => void;
  "typing:stop": (payload: { roomId: string }, cb?: (res: any) => void) => void;

  "room:kick": (
    payload: { roomId: string; targetSessionId: string },
    cb?: (res: any) => void
  ) => void;

  "room:ban": (
    payload: { roomId: string; targetSessionId: string; minutes?: number },
    cb?: (res: any) => void
  ) => void;

  "call:start": (
    payload: { targetSessionId: string; roomId?: string }, // roomId optional (context)
    cb?: (res: any) => void
  ) => void;

  "call:accept": (payload: { callId: string }, cb?: (res: any) => void) => void;

  "call:offer": (
    payload: { callId: string; sdp: any },
    cb?: (res: any) => void
  ) => void;

  "call:answer": (
    payload: { callId: string; sdp: any },
    cb?: (res: any) => void
  ) => void;

  "call:ice": (
    payload: { callId: string; candidate: any },
    cb?: (res: any) => void
  ) => void;

  "call:end": (
    payload: { callId: string; reason?: string },
    cb?: (res: any) => void
  ) => void;
};

export type ServerToClientEvents = {
  "presence:update": (payload: {
    roomId: string;
    sessionIds: string[];
  }) => void;

  "msg:new": (payload: any) => void;
  "dm:new": (payload: any) => void;

  "invite:new": (payload: any) => void;

  "typing:update": (payload: {
    roomId: string;
    sessionId: string;
    isTyping: boolean;
  }) => void;

  "room:kicked": (payload: { roomId: string; bySessionId: string }) => void;

  "room:banned": (payload: {
    roomId: string;
    bySessionId: string;
    minutes: number;
  }) => void;

  // ✅ Added for owner-leave auto-close
  "room:closed": (payload: { roomId: string; bySessionId: string }) => void;

  "call:ring": (payload: {
    callId: string;
    fromSessionId: string;
    roomId?: string | null;
  }) => void;

  "call:accepted": (payload: { callId: string; bySessionId: string }) => void;

  "call:offer": (payload: { callId: string; sdp: any }) => void;
  "call:answer": (payload: { callId: string; sdp: any }) => void;
  "call:ice": (payload: { callId: string; candidate: any }) => void;

  "call:ended": (payload: {
    callId: string;
    reason: string;
    bySessionId?: string | null;
  }) => void;

  "call:busy": (payload: { targetSessionId: string }) => void;
};

export type SocketData = {
  sessionId: string;
  sessionKey: string;
};
