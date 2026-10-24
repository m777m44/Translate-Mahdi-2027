/**
 * p2pSession.ts — peer-to-peer translated conversation between two phones.
 *
 * The web equivalent of RTranslator's Bluetooth Conversation mode: a direct
 * WebRTC data channel (end-to-end encrypted by DTLS-SRTP, no server in the
 * media path) with manual signaling. Because no signaling server is shipped,
 * the two peers exchange a single compact code (QR / copy-paste / share sheet)
 * once, then chat directly. Each side translates incoming text locally with
 * whatever engines it has (on-device neural, offline dictionary, or cloud), so
 * no translation ever leaves the pair.
 */

export type P2PConnectionState =
  | 'idle'
  | 'creating-offer'
  | 'waiting-answer'
  | 'accepting-offer'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed';

export interface P2PMessage {
  id: string;
  text: string;
  lang: string;
  /** Display name chosen by the sender. */
  name?: string;
  /** Epoch ms. */
  ts: number;
}

export interface P2PSessionEvents {
  onState?: (state: P2PConnectionState) => void;
  onMessage?: (message: P2PMessage) => void;
  onError?: (message: string) => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

function encode(obj: unknown): string {
  // URL-safe base64 so the code survives QR, share sheets and chat apps.
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function decode<T>(code: string): T {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
  return JSON.parse(decodeURIComponent(escape(atob(padded))));
}

export function isWebRtcSupported(): boolean {
  return typeof RTCPeerConnection !== 'undefined';
}

export class P2PSession {
  private pc: RTCPeerConnection | null = null;
  private channel: RTCDataChannel | null = null;
  private events: P2PSessionEvents;
  private iceCandidates: RTCIceCandidateInit[] = [];
  private iceResolve: (() => void) | null = null;
  state: P2PConnectionState = 'idle';

  constructor(events: P2PSessionEvents = {}) {
    this.events = events;
  }

  private setState(state: P2PConnectionState) {
    this.state = state;
    this.events.onState?.(state);
  }

  private createPeer(): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'connected') this.setState('connected');
      else if (s === 'disconnected') this.setState('disconnected');
      else if (s === 'failed') this.setState('failed');
    };
    pc.onicecandidate = (event) => {
      if (!event.candidate) {
        this.iceCandidates.sort((a, b) => String(a.candidate).localeCompare(String(b.candidate)));
        this.iceResolve?.();
      } else {
        this.iceCandidates.push(event.candidate.toJSON());
      }
    };
    return pc;
  }

  private bindChannel(channel: RTCDataChannel) {
    this.channel = channel;
    channel.onopen = () => this.setState('connected');
    channel.onclose = () => this.setState('disconnected');
    channel.onerror = () => this.events.onError?.('فشلت قناة الاتصال المباشر');
    channel.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as P2PMessage;
        this.events.onMessage?.(msg);
      } catch {
        this.events.onError?.('وصلت رسالة غير صالحة من الطرف الآخر');
      }
    };
  }

  private waitForIce(): Promise<void> {
    return new Promise((resolve) => {
      this.iceResolve = resolve;
      // Safety timeout — proceed even if trickle ICE is slow on restrictive NATs.
      window.setTimeout(() => resolve(), 4000);
    });
  }

  /** Host side: produce the offer code the joiner scans/pastes. */
  async createOffer(): Promise<string> {
    this.setState('creating-offer');
    this.pc = this.createPeer();
    this.bindChannel(this.pc.createDataChannel('mahdi-chat', { ordered: true }));

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await this.waitForIce();

    this.setState('waiting-answer');
    return encode({
      v: 1,
      t: 'offer',
      sdp: this.pc.localDescription!.sdp,
      ice: this.iceCandidates,
    });
  }

  /** Host side: accept the joiner's answer code. */
  async acceptAnswer(code: string): Promise<void> {
    const payload = decode<{ t: string; sdp: string; ice: RTCIceCandidateInit[] }>(code);
    if (payload.t !== 'answer' || !this.pc) {
      throw new Error('كود الإجابة غير صالح أو أنشأت الجلسة بصفة منضم وليس مضيفاً.');
    }
    this.setState('connecting');
    await this.pc.setRemoteDescription({ type: 'answer', sdp: payload.sdp });
    for (const c of payload.ice || []) {
      await this.pc.addIceCandidate(c).catch(() => {});
    }
  }

  /** Joiner side: consume an offer code and produce the answer code. */
  static async answerOffer(code: string): Promise<{ session: P2PSession; answer: string }> {
    const payload = decode<{ t: string; sdp: string; ice: RTCIceCandidateInit[] }>(code);
    if (payload.t !== 'offer') {
      throw new Error('هذا الكود ليس كود دعوة — تأكد من مسح كود المضيف.');
    }
    const session = new P2PSession();
    session.setState('accepting-offer');
    session.pc = session.createPeer();
    session.pc.ondatachannel = (event) => session.bindChannel(event.channel);

    await session.pc.setRemoteDescription({ type: 'offer', sdp: payload.sdp });
    for (const c of payload.ice || []) {
      await session.pc.addIceCandidate(c).catch(() => {});
    }

    const answer = await session.pc.createAnswer();
    await session.pc.setLocalDescription(answer);
    await session.waitForIce();

    session.setState('connecting');
    const answerCode = encode({
      v: 1,
      t: 'answer',
      sdp: session.pc.localDescription!.sdp,
      ice: session.iceCandidates,
    });
    return { session, answer: answerCode };
  }

  send(message: Omit<P2PMessage, 'id' | 'ts'>): void {
    if (!this.channel || this.channel.readyState !== 'open') {
      this.events.onError?.('لا يوجد اتصال نشط مع الطرف الآخر بعد.');
      return;
    }
    const full: P2PMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
      ...message,
    };
    this.channel.send(JSON.stringify(full));
  }

  close(): void {
    try { this.channel?.close(); } catch { /* ignore */ }
    try { this.pc?.close(); } catch { /* ignore */ }
    this.channel = null;
    this.pc = null;
    this.setState('idle');
  }
}
