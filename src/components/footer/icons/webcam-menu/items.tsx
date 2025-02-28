import React, { useEffect, useState } from 'react';
import { Menu } from '@headlessui/react';
import { createSelector } from '@reduxjs/toolkit';
import { Room, Track } from 'livekit-client';
import { useTranslation } from 'react-i18next';

import { RootState, useAppDispatch, useAppSelector } from '../../../../store';
import { updateSelectedVideoDevice } from '../../../../store/slices/roomSettingsSlice';
import { updateIsActiveWebcam } from '../../../../store/slices/bottomIconsActivitySlice';

interface IWebcamMenuItemsProps {
  currentRoom: Room;
}
const videoDevicesSelector = createSelector(
  (state: RootState) => state.roomSettings.videoDevices,
  (videoDevices) => videoDevices,
);

const selectedVideoDeviceSelector = createSelector(
  (state: RootState) => state.roomSettings.selectedVideoDevice,
  (selectedVideoDevice) => selectedVideoDevice,
);

const WebcamMenuItems = ({ currentRoom }: IWebcamMenuItemsProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const videoDevices = useAppSelector(videoDevicesSelector);
  const selectedVideoDevice = useAppSelector(selectedVideoDeviceSelector);

  const [devicesMenu, setDevicesMenu] = useState<Array<JSX.Element>>();
  const [newDevice, setNewDevice] = useState<string>();

  useEffect(() => {
    const devicesMenu = videoDevices.map((device) => {
      return (
        <div className="" role="none" key={device.id}>
          <Menu.Item>
            {() => (
              <p
                className={`${
                  selectedVideoDevice === device.id
                    ? 'text-brandColor2'
                    : 'text-gray-700 dark:text-gray-400'
                } rounded group flex items-center px-3 py-[0.4rem] text-[10px] lg:text-xs transition ease-in hover:bg-brandColor1 hover:text-white`}
                onClick={() => setNewDevice(device.id)}
              >
                {device.label}
              </p>
            )}
          </Menu.Item>
        </div>
      );
    });
    setDevicesMenu(devicesMenu);
  }, [selectedVideoDevice, videoDevices]);

  useEffect(() => {
    const changeDevice = async (id: string) => {
      await currentRoom.switchActiveDevice('videoinput', id);
    };
    if (newDevice) {
      changeDevice(newDevice);
      dispatch(updateSelectedVideoDevice(newDevice));
    }
  }, [newDevice, currentRoom, dispatch]);

  const leaveWebcam = () => {
    currentRoom.localParticipant.videoTracks.forEach(async (publication) => {
      if (
        publication.track &&
        publication.track.source === Track.Source.Camera
      ) {
        currentRoom.localParticipant.unpublishTrack(publication.track);
      }
    });
    dispatch(updateIsActiveWebcam(false));
    dispatch(updateSelectedVideoDevice(''));
  };

  return (
    <Menu.Items
      static
      className="origin-bottom-right z-[9999] absolute left-0 mt-2 w-40 bottom-[40px] rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none"
    >
      {devicesMenu}
      <div className="" role="none">
        <Menu.Item>
          {() => (
            <p
              className="text-red-900 group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs transition ease-in hover:bg-red-400 hover:text-white"
              onClick={() => leaveWebcam()}
            >
              {t('footer.menus.leave-webcam')}
            </p>
          )}
        </Menu.Item>
      </div>
    </Menu.Items>
  );
};

export default WebcamMenuItems;
