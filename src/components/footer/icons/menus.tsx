import React from 'react';
import { Menu, Transition } from '@headlessui/react';
import { toast } from 'react-toastify';
import { createSelector } from '@reduxjs/toolkit';
import { useTranslation } from 'react-i18next';

import {
  RootState,
  store,
  useAppDispatch,
  useAppSelector,
} from '../../../store';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import LockSettingsModal from '../modals/lockSettingsModal';
import {
  updateShowLockSettingsModal,
  updateShowRtmpModal,
} from '../../../store/slices/bottomIconsActivitySlice';
import RtmpModal from '../modals/rtmpModal';

const showLockSettingsModalSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.showLockSettingsModal,
  (showLockSettingsModal) => showLockSettingsModal,
);
const isActiveRtmpBroadcastingSelector = createSelector(
  (state: RootState) => state.session.isActiveRtmpBroadcasting,
  (isActiveRtmpBroadcasting) => isActiveRtmpBroadcasting,
);
const showRtmpModalSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.showRtmpModal,
  (showRtmpModal) => showRtmpModal,
);
const MenusIcon = () => {
  const session = store.getState().session;
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const showLockSettingsModal = useAppSelector(showLockSettingsModalSelector);
  const showRtmpModal = useAppSelector(showRtmpModalSelector);
  const isActiveRtmpBroadcasting = useAppSelector(
    isActiveRtmpBroadcastingSelector,
  );

  const muteAllUsers = async () => {
    const body = {
      sid: session.currentRoom.sid,
      room_id: session.currentRoom.room_id,
      user_id: 'all',
      muted: true,
    };
    const res = await sendAPIRequest('muteUnmuteTrack', body);

    if (res.status) {
      toast(t('footer.notice.muted-all-microphone'), {
        toastId: 'asked-status',
        type: 'info',
      });
    } else {
      toast(t(res.msg), {
        toastId: 'asked-status',
        type: 'error',
      });
    }
  };

  const openLockSettingsModal = () => {
    dispatch(updateShowLockSettingsModal(true));
  };

  const openRtmpModal = () => {
    dispatch(updateShowRtmpModal(true));
  };

  const render = () => {
    return (
      <div className="menu relative">
        <Menu>
          {({ open }) => (
            <>
              <Menu.Button className="h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] rounded-full bg-[#F2F2F2] hover:bg-[#ECF4FF] flex items-center justify-center cursor-pointer">
                <i className="pnm-menu-horizontal text-brandColor1 text-[3px] lg:text-[5px]" />
              </Menu.Button>

              {/* Use the Transition component. */}
              <Transition
                show={open}
                enter="transition duration-100 ease-out"
                enterFrom="transform scale-95 opacity-0"
                enterTo="transform scale-100 opacity-100"
                leave="transition duration-75 ease-out"
                leaveFrom="transform scale-100 opacity-100"
                leaveTo="transform scale-95 opacity-0"
              >
                {/* Mark this component as `static` */}
                <Menu.Items
                  static
                  className="origin-bottom-left sm:-left-20 right-0 sm:right-auto z-[9999] absolute mt-2 w-56 bottom-[48px] rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none"
                >
                  <div className="py-1" role="none">
                    <Menu.Item>
                      <button
                        className="footer-podcast-button text-gray-700 dark:text-gray-400 rounded group flex items-center py-1 lg:py-2 px-4 text-xs lg:text-sm text-left w-full transition ease-in hover:text-brandColor2"
                        onClick={() => openRtmpModal()}
                      >
                        {isActiveRtmpBroadcasting ? (
                          <div className="lds-ripple">
                            <div></div>
                            <div></div>
                          </div>
                        ) : null}
                        <i className="pnm-broadcasting text-brandColor1 mr-2 transition ease-in group-hover:text-brandColor2" />
                        {isActiveRtmpBroadcasting
                          ? t('footer.icons.stop-rtmp-broadcasting')
                          : t('footer.icons.start-rtmp-broadcasting')}
                      </button>
                    </Menu.Item>
                  </div>
                  <div className="py-1" role="none">
                    <Menu.Item>
                      <button
                        className="text-gray-700 dark:text-gray-400 rounded group flex items-center py-1 lg:py-2 px-4 text-xs lg:text-sm text-left w-full transition ease-in hover:text-brandColor2"
                        onClick={() => muteAllUsers()}
                      >
                        <i className="pnm-mic-mute text-brandColor1 mr-2 transition ease-in group-hover:text-brandColor2" />
                        {t('footer.menus.mute-all-users')}
                      </button>
                    </Menu.Item>
                  </div>
                  <div className="py-1" role="none">
                    <Menu.Item>
                      <button
                        className="text-gray-700 dark:text-gray-400 rounded group flex items-center py-1 lg:py-2 px-4 text-xs lg:text-sm text-left w-full transition ease-in hover:text-brandColor2"
                        onClick={() => openLockSettingsModal()}
                      >
                        <i className="pnm-lock text-brandColor1 mr-2 transition ease-in group-hover:text-brandColor2" />
                        {t('footer.menus.room-lock-settings')}
                      </button>
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </>
          )}
        </Menu>
      </div>
    );
  };

  return (
    <>
      {render()} {showLockSettingsModal ? <LockSettingsModal /> : null}{' '}
      {showRtmpModal ? <RtmpModal /> : null}
    </>
  );
};

export default MenusIcon;
