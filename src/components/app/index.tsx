import React, { useState, useEffect, useRef } from 'react';
import MobileDetect from 'mobile-detect';
import { useTranslation } from 'react-i18next';

import ErrorPage from '../extra-pages/Error';
import Loading from '../extra-pages/Loading';
import Footer from '../footer';
import Header from '../header';
import MainArea from '../main-area';

import sendAPIRequest from '../../helpers/api/plugNmeetAPI';
import { store, useAppDispatch } from '../../store';
import {
  addToken,
  updateUserDeviceType,
} from '../../store/slices/sessionSlice';
import StartupJoinModal from './joinModal';
import useLivekitConnect from '../../helpers/livekit/hooks/useLivekitConnect';
import AudioNotification from './audioNotification';
import {
  updateIsActiveChatPanel,
  updateIsActiveParticipantsPanel,
  updateScreenWidth,
} from '../../store/slices/bottomIconsActivitySlice';

const App = () => {
  const dispatch = useAppDispatch();
  const {
    error,
    setError,
    roomConnectionStatus,
    setRoomConnectionStatus,
    currentRoom,
    audioSubscribers,
    videoSubscribers,
    screenShareTracks,
    startLivekitConnection,
  } = useLivekitConnect();

  const [loading, setLoading] = useState<boolean>(true);
  // it could be recorder or RTMP bot
  const [isRecorder, setIsRecorder] = useState<boolean>(false);
  const [deviceClass, setDeviceClass] = useState<string>('');
  const [orientationClass, setOrientationClass] =
    useState<string>('landscape-device');
  const [screenHeight, setScreenHeight] = useState<string>('');
  const ref = useRef(null);
  const { t } = useTranslation();

  useEffect(() => {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
    if (typeof params.access_token === 'undefined') {
      setLoading(false);
      setError({
        title: t('app.token-missing-title'),
        text: t('app.token-missing-des'),
      });
    } else {
      const verifyToken = async () => {
        let res: any;
        try {
          res = await sendAPIRequest('verifyToken', {});
        } catch (error: any) {
          setRoomConnectionStatus('ready');
          setLoading(false);
          setError({
            title: t('app.verification-failed-title'),
            text: t('app.token-not-valid'),
          });
          return;
        }

        setRoomConnectionStatus('ready');
        setLoading(false);
        if (res.status) {
          dispatch(addToken(params.access_token));
        } else {
          setError({
            title: t('app.verification-failed-title'),
            text: t(res.msg),
          });
        }
      };

      if (!currentRoom) {
        setRoomConnectionStatus('checking');
        verifyToken();
      }
    }
  }, [t, dispatch, currentRoom, setError, setRoomConnectionStatus]);

  useEffect(() => {
    if (
      roomConnectionStatus === 'connecting' ||
      roomConnectionStatus === 're-connecting' ||
      roomConnectionStatus === 'checking'
    ) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [roomConnectionStatus]);

  useEffect(() => {
    if (currentRoom) {
      if (
        currentRoom.localParticipant.identity === 'RECORDER_BOT' ||
        currentRoom.localParticipant.identity === 'RTMP_BOT'
      ) {
        setIsRecorder(true);
      }
    }
  }, [currentRoom]);

  // use for updating service based on screen size
  useEffect(() => {
    window.onresize = () => {
      dispatch(updateScreenWidth(window.innerWidth));
      adjustScreenSize();

      const isActiveChatPanel =
        store.getState().bottomIconsActivity.isActiveChatPanel;
      const isActiveParticipantsPanel =
        store.getState().bottomIconsActivity.isActiveParticipantsPanel;
      if (
        window.innerWidth < 1024 &&
        isActiveChatPanel &&
        isActiveParticipantsPanel
      ) {
        // if both open better to close one
        dispatch(updateIsActiveParticipantsPanel(false));
      }
    };

    dispatch(updateScreenWidth(window.innerWidth));

    if (window.innerWidth < 1024) {
      dispatch(updateIsActiveParticipantsPanel(false));
      dispatch(updateIsActiveChatPanel(false));
    }

    let deviceClass = 'is-pc';
    const md = new MobileDetect(window.navigator.userAgent);
    if (md.mobile()) {
      deviceClass = 'is-mobile ';
      dispatch(updateUserDeviceType('mobile'));
    } else if (md.tablet()) {
      deviceClass = 'is-tablet ';
      dispatch(updateUserDeviceType('tablet'));
    }

    const os = md.os();
    if (os === 'AndroidOS') {
      deviceClass += 'is-android';
    } else if (os === 'iOS' || os === 'iPadOS') {
      deviceClass += 'is-ios';
    }
    setDeviceClass(deviceClass);

    const mql = window.matchMedia('(orientation: portrait)');
    if (mql.matches) {
      setOrientationClass('portrait-device');
    }
    mql.addEventListener('change', (m) => {
      if (m.matches) {
        setOrientationClass('portrait-device');
      } else {
        setOrientationClass('landscape-device');
      }
    });
  }, [dispatch]);

  useEffect(() => {
    adjustScreenSize();
  }, [currentRoom?.state]);

  const adjustScreenSize = () => {
    const el: any = ref.current;
    if (el) {
      setScreenHeight(`${el.clientHeight}px`);
    }
  };

  const renderMainApp = () => {
    if (currentRoom) {
      return (
        <div className="plugNmeet-app overflow-hidden" ref={ref}>
          {!isRecorder ? <Header currentRoom={currentRoom} /> : null}
          <MainArea
            currentRoom={currentRoom}
            audioSubscribers={audioSubscribers}
            videoSubscribers={videoSubscribers}
            screenShareTracks={screenShareTracks}
            isRecorder={isRecorder}
          />
          {!isRecorder ? <Footer currentRoom={currentRoom} /> : null}
          <AudioNotification />
        </div>
      );
    }

    return null;
  };

  const onCloseStartupModal = () => {
    startLivekitConnection();
  };

  const render = () => {
    if (loading) {
      return <Loading text={t('app.' + roomConnectionStatus)} />;
    } else if (error && !loading) {
      return <ErrorPage title={error.title} text={error.text} />;
    } else if (currentRoom?.state === 'connected') {
      return renderMainApp();
    } else if (roomConnectionStatus === 'ready') {
      return <StartupJoinModal onCloseModal={onCloseStartupModal} />;
    } else {
      return null;
    }
  };

  return (
    <div
      className={`${orientationClass} ${deviceClass}`}
      style={{ height: screenHeight }}
    >
      {render()}
    </div>
  );
};

export default App;
