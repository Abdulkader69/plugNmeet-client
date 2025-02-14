import React, { useEffect, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { Room, VideoPresets, createLocalTracks, Track } from 'livekit-client';
import { Dialog, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { useAppSelector, RootState, useAppDispatch } from '../../../store';
import {
  updateIsActiveWebcam,
  updateShowVideoShareModal,
} from '../../../store/slices/bottomIconsActivitySlice';
import { getDevices } from '../../../helpers/utils';
import PreviewWebcam from './previewWebcam';
import {
  addVideoDevices,
  IMediaDevice,
  updateSelectedVideoDevice,
} from '../../../store/slices/roomSettingsSlice';

interface IShareWebcamModal {
  currentRoom: Room;
}

const showVideoShareModalSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.showVideoShareModal,
  (showVideoShareModal) => showVideoShareModal,
);

const ShareWebcamModal = ({ currentRoom }: IShareWebcamModal) => {
  const showVideoShareModal = useAppSelector(showVideoShareModalSelector);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [selectedWebcam, setSelectWebcam] = useState<string>('');
  const [devices, setDevices] = useState<Array<JSX.Element>>([]);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  useEffect(() => {
    const getDeviceMics = async () => {
      const mics = await getDevices('videoinput');
      const videoDevices: Array<IMediaDevice> = [];

      const options = mics.map((mic) => {
        const device: IMediaDevice = {
          id: mic.deviceId,
          label: mic.label,
        };
        videoDevices.push(device);

        return (
          <option value={mic.deviceId} key={mic.deviceId}>
            {mic.label}
          </option>
        );
      });
      setDevices(options);
      setSelectWebcam(mics[0].deviceId);

      if (videoDevices.length) {
        dispatch(addVideoDevices(videoDevices));
      }
    };
    getDeviceMics();
  }, [dispatch]);

  useEffect(() => {
    if (showVideoShareModal) {
      setIsOpen(true);
    }
  }, [showVideoShareModal]);

  const shareWebcam = async () => {
    onClose();
    if (!selectedWebcam) {
      return;
    }

    const localTrack = await createLocalTracks({
      audio: false,
      video: {
        deviceId: selectedWebcam,
        resolution: VideoPresets.hd,
      },
    });

    localTrack.forEach(async (track) => {
      if (track.kind === Track.Kind.Video) {
        await currentRoom.localParticipant.publishTrack(track);
        dispatch(updateIsActiveWebcam(true));
      }
    });

    dispatch(updateSelectedVideoDevice(selectedWebcam));
  };

  const onClose = () => {
    setIsOpen(false);
    dispatch(updateShowVideoShareModal(false));
    dispatch(updateIsActiveWebcam(false));
  };

  const render = () => {
    if (!showVideoShareModal) {
      return null;
    }

    return (
      <Transition
        show={isOpen}
        enter="transition duration-100 ease-out"
        enterFrom="transform scale-95 opacity-0"
        enterTo="transform scale-100 opacity-100"
        leave="transition duration-75 ease-out"
        leaveFrom="transform scale-100 opacity-100"
        leaveTo="transform scale-95 opacity-0"
      >
        <Dialog
          open={isOpen}
          onClose={() => onClose()}
          className="share-webcam-popup-wrap fixed z-[99999] inset-0 overflow-y-auto"
        >
          <div className="flex items-center justify-center min-h-screen">
            <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

            <div className="popup-inner bg-white w-full max-w-sm rounded-3xl shadow-header relative px-6 py-14">
              <button
                className="close-btn absolute top-8 right-6 w-[25px] h-[25px] outline-none"
                type="button"
                onClick={() => onClose()}
              >
                <span className="inline-block h-[1px] w-[20px] bg-[#004D90] absolute top-0 left-0 rotate-45" />
                <span className="inline-block h-[1px] w-[20px] bg-[#004D90] absolute top-0 left-0 -rotate-45" />
              </button>
              <Dialog.Title className="mb-6">
                {t('footer.modal.select-webcam')}
              </Dialog.Title>

              <div className="col-span-6 sm:col-span-3">
                <select
                  value={selectedWebcam}
                  onChange={(e) => setSelectWebcam(e.target.value)}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  {devices}
                </select>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <PreviewWebcam deviceId={selectedWebcam} />
              </div>

              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                <button
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={() => shareWebcam()}
                >
                  {t('share')}
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition>
    );
  };
  return <React.Fragment>{render()}</React.Fragment>;
};

export default ShareWebcamModal;
