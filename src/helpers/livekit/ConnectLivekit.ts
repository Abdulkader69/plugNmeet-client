import { Dispatch } from 'react';
import { isEmpty } from 'validator';
import {
  LocalParticipant,
  LocalTrackPublication,
  Participant,
  RemoteParticipant,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  Track,
  VideoPresets,
} from 'livekit-client';

import { store } from '../../store';
import { updateParticipant } from '../../store/slices/participantSlice';
import {
  addCurrentRoom,
  addCurrentUser,
  addToken,
  updateScreenSharing,
  updateTotalAudioSubscribers,
  updateTotalVideoSubscribers,
} from '../../store/slices/sessionSlice';

import HandleParticipants from './HandleParticipants';
import HandleMediaTracks from './HandleMediaTracks';
import HandleDataMessages from './HandleDataMessages';
import HandleRoomMetadata from './HandleRoomMetadata';
import { IErrorPageProps } from '../../components/extra-pages/Error';
import {
  closeWebsocketConnection,
  openWebsocketConnection,
  sendWebsocketMessage,
} from '../websocketConnector';
import HandleActiveSpeakers from './HandleActiveSpeakers';
import {
  DataMessageType,
  IDataMessage,
  SystemMsgType,
} from '../../store/slices/interfaces/dataMessages';

type connectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 're-connecting'
  | 'error';

export interface IConnectLivekit {
  get room(): Room;
  get videoSubscribersMap(): Map<
    string,
    Participant | LocalParticipant | RemoteParticipant
  >;
  updateVideoSubscribers(
    participant: Participant | LocalParticipant | RemoteParticipant,
    add?: boolean,
  ): void;
  updateAudioSubscribers(
    participant: Participant | LocalParticipant | RemoteParticipant,
    add?: boolean,
  ): void;
  setScreenShareTrack(
    track: LocalTrackPublication | RemoteTrackPublication | undefined,
    participant: LocalParticipant | RemoteParticipant,
    add?: boolean,
  ): void;
}

export default class ConnectLivekit {
  private _audioSubscribersMap = new Map<string, RemoteParticipant>();
  private audioSubscribersState: Dispatch<Map<string, RemoteParticipant>>;

  private _videoSubscribersMap = new Map<
    string,
    Participant | LocalParticipant | RemoteParticipant
  >();
  private videoSubscribersState: Dispatch<
    Map<string, LocalParticipant | RemoteParticipant>
  >;

  private _screenShareTracksMap = new Map<
    string,
    LocalTrackPublication | RemoteTrackPublication
  >();
  private screenShareTracksState: Dispatch<
    Map<string, LocalTrackPublication | RemoteTrackPublication>
  >;

  private currentRoomState: Dispatch<Room>;
  private errorState: Dispatch<IErrorPageProps>;
  private roomConnectionStatusState: Dispatch<connectionStatus>;

  private token: string;
  public _room: Room;
  private url = (window as any).LIVEKIT_SERVER_URL;
  private tokenRenewInterval: any;

  private handleParticipant: HandleParticipants;
  private handleMediaTracks: HandleMediaTracks;
  private handleDataMessages: HandleDataMessages;
  private handleRoomMetadata: HandleRoomMetadata;
  private handleActiveSpeakers: HandleActiveSpeakers;

  constructor(
    audioSubscribersState: Dispatch<Map<string, RemoteParticipant>>,
    mediaSubscribersState: Dispatch<
      Map<string, LocalParticipant | RemoteParticipant>
    >,
    currentRoomState: Dispatch<Room>,
    errorState: Dispatch<IErrorPageProps>,
    roomConnectionStatusState: Dispatch<connectionStatus>,
    screenShareTracksState: Dispatch<
      Map<string, LocalTrackPublication | RemoteTrackPublication>
    >,
  ) {
    this.token = store.getState().session.token;
    // audio Subscribers state
    this.audioSubscribersState = audioSubscribersState;
    // video Subscribers state
    this.videoSubscribersState = mediaSubscribersState;
    // screen share state
    this.screenShareTracksState = screenShareTracksState;

    this.currentRoomState = currentRoomState;
    this.errorState = errorState;
    this.roomConnectionStatusState = roomConnectionStatusState;

    this.handleParticipant = new HandleParticipants(this);
    this.handleMediaTracks = new HandleMediaTracks(this);
    this.handleDataMessages = new HandleDataMessages(this);
    this.handleRoomMetadata = new HandleRoomMetadata();
    this.handleActiveSpeakers = new HandleActiveSpeakers(this);

    this.roomConnectionStatusState('connecting');
    this._room = this.configureRoom();
    this.connect();
  }

  public get videoSubscribersMap() {
    return this._videoSubscribersMap;
  }

  public get room() {
    return this._room;
  }

  private connect = async () => {
    try {
      await this._room.connect(this.url, this.token);
      // we'll prepare our information
      await this.initiateParticipants();
      await this.updateSession();
      // open websocket
      openWebsocketConnection();
      // finally
      this.roomConnectionStatusState('connected');
      this.currentRoomState(this._room);
      // start token renew interval
      this.startTokenRenewInterval();
    } catch (error) {
      this.roomConnectionStatusState('error');
      this.errorState({
        title: 'Error',
        text: String(error),
      });
    }
  };

  private initiateParticipants = async () => {
    // check if current user is recorder/rtmp bot
    const isRecorder =
      (this._room.localParticipant.identity === 'RECORDER_BOT' ||
        this._room.localParticipant.identity === 'RTMP_BOT') ??
      false;

    // local Participant
    store.dispatch(
      addCurrentUser({
        sid: this._room.localParticipant.sid,
        userId: this._room.localParticipant.identity,
        name: this._room.localParticipant.name,
        isRecorder,
      }),
    );
    this.handleParticipant.setParticipantMetadata(
      '',
      this._room.localParticipant,
    );

    // start recorder task
    if (isRecorder) {
      this.handleParticipant.recorderJoined();
    } else {
      // otherwise we'll added user
      this.handleParticipant.addParticipant(this._room.localParticipant);
    }

    // all other connected Participants
    this._room.participants.forEach((participant) => {
      this.handleParticipant.addParticipant(participant);

      participant.getTracks().forEach((track) => {
        if (track.isSubscribed) {
          if (
            track.source === Track.Source.ScreenShare ||
            track.source === Track.Source.ScreenShareAudio
          ) {
            store.dispatch(
              updateParticipant({
                id: participant.identity,
                changes: {
                  screenShareTrack: 1,
                },
              }),
            );
            store.dispatch(
              updateScreenSharing({
                isActive: true,
                sharedBy: participant.identity,
              }),
            );
          } else {
            this.updateVideoSubscribers(participant);
          }
        }
      });
    });

    return;
  };

  private updateSession = async () => {
    store.dispatch(addToken(this.token));

    store.dispatch(
      addCurrentRoom({
        sid: this._room.sid,
        room_id: this._room.name,
      }),
    );

    if (!isEmpty(this._room.metadata) && this._room.metadata) {
      this.handleRoomMetadata.setRoomMetadata(this._room.metadata);
    }

    return;
  };

  private configureRoom = () => {
    const room = new Room({
      adaptiveStream: true,
      dynacast: (window as any).ENABLE_DYNACAST ?? false,
      videoCaptureDefaults: {
        resolution: VideoPresets.hd.resolution,
      },
      publishDefaults: {
        simulcast: (window as any).ENABLE_SIMULCAST ?? false,
        stopMicTrackOnMute: (window as any).STOP_MIC_TRACK_ON_MUTE ?? false,
      },
    });

    room.on(RoomEvent.Reconnecting, () =>
      this.roomConnectionStatusState('re-connecting'),
    );
    room.on(RoomEvent.Reconnected, () =>
      this.roomConnectionStatusState('connected'),
    );
    room.on(RoomEvent.Disconnected, this.onDisconnected);
    room.on(
      RoomEvent.RoomMetadataChanged,
      this.handleRoomMetadata.setRoomMetadata,
    );
    room.on(
      RoomEvent.ActiveSpeakersChanged,
      this.handleActiveSpeakers.activeSpeakersChanged,
    );
    room.on(RoomEvent.MediaDevicesError, this.mediaDevicesError);

    room.on(RoomEvent.DataReceived, this.handleDataMessages.dataReceived);

    room.on(
      RoomEvent.ParticipantConnected,
      this.handleParticipant.participantConnected,
    );
    room.on(
      RoomEvent.ParticipantDisconnected,
      this.handleParticipant.participantDisconnected,
    );
    room.on(
      RoomEvent.ParticipantMetadataChanged,
      this.handleParticipant.setParticipantMetadata,
    );
    room.on(
      RoomEvent.ConnectionQualityChanged,
      this.handleParticipant.connectionQualityChanged,
    );

    room.on(
      RoomEvent.LocalTrackPublished,
      this.handleMediaTracks.localTrackPublished,
    );
    room.on(
      RoomEvent.LocalTrackUnpublished,
      this.handleMediaTracks.localTrackUnpublished,
    );
    room.on(RoomEvent.TrackSubscribed, this.handleMediaTracks.trackSubscribed);
    room.on(
      RoomEvent.TrackUnpublished,
      this.handleMediaTracks.trackUnsubscribed,
    );
    room.on(
      RoomEvent.TrackSubscriptionFailed,
      this.handleMediaTracks.trackSubscriptionFailed,
    );
    room.on(RoomEvent.TrackMuted, this.handleMediaTracks.trackMuted);
    room.on(RoomEvent.TrackUnmuted, this.handleMediaTracks.trackUnmuted);
    room.on(
      RoomEvent.TrackStreamStateChanged,
      this.handleMediaTracks.trackStreamStateChanged,
    );

    return room;
  };

  private onDisconnected = () => {
    this.errorState({
      title: 'Room disconnected',
      text: 'Room was closed or disconnected. ',
    });
    this.roomConnectionStatusState('disconnected');
    closeWebsocketConnection();
    this.handleActiveSpeakers.onLivekitDisconnect();
    clearInterval(this.tokenRenewInterval);
    this.handleParticipant.clearParticipantCounterInterval();
  };

  private mediaDevicesError = (error: Error) => {
    // to do
    console.log(error);
  };

  private startTokenRenewInterval = () => {
    this.tokenRenewInterval = setInterval(() => {
      // get current token that is store in redux
      const token = store.getState().session.token;
      const msg: IDataMessage = {
        type: DataMessageType.SYSTEM,
        message_id: '',
        room_sid: this._room.sid,
        room_id: this._room.name,
        body: {
          type: SystemMsgType.RENEW_TOKEN,
          from: {
            sid: this._room.localParticipant.sid,
            userId: this._room.localParticipant.identity,
          },
          msg: token,
        },
      };
      sendWebsocketMessage(JSON.stringify(msg));
    }, 5 * 60 * 1000);
  };

  /**
   * This method will set screenshare media track
   * @param track: LocalTrackPublication | RemoteTrackPublication
   * @param participant: LocalParticipant | RemoteParticipant
   * @param add: boolean
   */
  public setScreenShareTrack = (
    track: LocalTrackPublication | RemoteTrackPublication,
    participant: LocalParticipant | RemoteParticipant,
    add = true,
  ) => {
    console.log('=== setScreenShareTrack ===', track.source);
    if (add) {
      this._screenShareTracksMap.set(track.source, track);
      if (
        participant.sid !== this._room.localParticipant.sid &&
        track.source === Track.Source.ScreenShareAudio
      ) {
        this._screenShareTracksMap.set(track.source, track);
      }
    } else {
      this._screenShareTracksMap.delete(track.source);
    }

    this.screenShareTracksState(new Map(this._screenShareTracksMap as any));
  };

  /**
   * This method will add/update audio subscribers
   * @param participant: Participant | LocalParticipant | RemoteParticipant
   * @param add: boolean
   */
  public updateAudioSubscribers = (
    participant: Participant | LocalParticipant | RemoteParticipant,
    add = true,
  ) => {
    if (typeof participant.sid === 'undefined') {
      console.log('participant.sid undefined');
      return;
    }

    // we don't want to add local audio here.
    if (participant.sid === this._room.localParticipant.sid) {
      return;
    }

    if (add) {
      this._audioSubscribersMap.set(
        participant.sid,
        participant as RemoteParticipant,
      );
    } else {
      if (this._audioSubscribersMap.has(participant.sid)) {
        this._audioSubscribersMap.delete(participant.sid);
      }
    }

    this.audioSubscribersState(new Map(this._audioSubscribersMap as any));
    // update session reducer
    store.dispatch(
      updateTotalAudioSubscribers(this.audioSubscribersState.length),
    );
  };

  /**
   * This method will add/update webcams
   * This will also sort webcam lists based on active speaker event
   * @param participant: Participant | LocalParticipant | RemoteParticipant
   * @param add: boolean
   */
  public updateVideoSubscribers = (
    participant: Participant | LocalParticipant | RemoteParticipant,
    add = true,
  ) => {
    console.log('==== updateVideoSubscribers ====');
    if (typeof participant.sid === 'undefined') {
      console.log('participant.sid undefined');
      return;
    }

    if (add) {
      this._videoSubscribersMap.set(participant.sid, participant);
    } else {
      if (this._videoSubscribersMap.has(participant.sid)) {
        console.log('removing..', participant.sid);
        this._videoSubscribersMap.delete(participant.sid);
      }
    }

    // update session reducer
    store.dispatch(updateTotalVideoSubscribers(this._videoSubscribersMap.size));

    if (this._videoSubscribersMap.size <= 1) {
      this.videoSubscribersState(new Map(this._videoSubscribersMap as any));
      return;
    }

    const mediaSubscribersToArray = Array.from(this._videoSubscribersMap);
    const withoutLocalSubscriber = mediaSubscribersToArray.filter(
      (participants) => participants[0] !== this._room.localParticipant?.sid,
    );

    withoutLocalSubscriber.sort((a, b) => {
      const aPrt = a[1];
      const bPart = b[1];

      if (aPrt.isSpeaking && bPart.isSpeaking) {
        return bPart.audioLevel - aPrt.audioLevel;
      }
      // speaker goes first
      if (aPrt.isSpeaking !== bPart.isSpeaking) {
        if (aPrt.isSpeaking) {
          return -1;
        } else {
          return 1;
        }
      }

      // last active speaker first
      if (aPrt.lastSpokeAt !== bPart.lastSpokeAt) {
        const aLast = aPrt.lastSpokeAt?.getTime() ?? 0;
        const bLast = bPart.lastSpokeAt?.getTime() ?? 0;
        return bLast - aLast;
      }

      return (aPrt.joinedAt?.getTime() ?? 0) - (bPart.joinedAt?.getTime() ?? 0);
    });

    if (this._room.localParticipant.getTracks().length) {
      const localUser = [
        this._room.localParticipant.sid,
        this._room.localParticipant,
      ];
      withoutLocalSubscriber.unshift(localUser as any);
    }

    this.videoSubscribersState(new Map(withoutLocalSubscriber as any));

    console.log('===ended update ====');
  };
}
