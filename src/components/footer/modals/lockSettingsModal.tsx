import React, { Fragment } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { Transition, Dialog, Switch } from '@headlessui/react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import {
  RootState,
  store,
  useAppDispatch,
  useAppSelector,
} from '../../../store';
import { updateShowLockSettingsModal } from '../../../store/slices/bottomIconsActivitySlice';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';

const roomLockSettingsSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.default_lock_settings,
  (default_lock_settings) => default_lock_settings,
);
const LockSettingsModal = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const roomLockSettings = useAppSelector(roomLockSettingsSelector);
  const session = store.getState().session;

  const updateLockSettings = async (status, service: string) => {
    const direction = status ? 'lock' : 'unlock';

    const data = {
      sid: session.currentRoom.sid,
      room_id: session.currentRoom.room_id,
      user_id: 'all',
      service,
      direction,
    };

    const res = await sendAPIRequest('updateLockSettings', data);
    if (res.status) {
      toast(t('footer.notice.applied-settings'), {
        toastId: 'lock-setting-status',
        type: 'info',
      });
    } else {
      toast(res.msg, {
        type: 'error',
      });
    }
  };

  const closeModal = () => {
    dispatch(updateShowLockSettingsModal(false));
  };

  const showLockItems = () => {
    return (
      <Switch.Group>
        <div className="flex items-center mb-4">
          <Switch.Label className="pr-4 w-full max-w-[300px]">
            {t('footer.modal.lock-microphone')}
          </Switch.Label>
          <Switch
            checked={roomLockSettings?.lock_microphone ?? false}
            onChange={(e) => updateLockSettings(e, 'mic')}
            className={`${
              roomLockSettings?.lock_microphone ? 'bg-blue-600' : 'bg-gray-200'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            <span
              className={`${
                roomLockSettings?.lock_microphone
                  ? 'translate-x-6'
                  : 'translate-x-1'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>

        <div className="flex items-center mb-4">
          <Switch.Label className="pr-4 w-full max-w-[300px]">
            {t('footer.modal.lock-webcams')}
          </Switch.Label>
          <Switch
            checked={roomLockSettings?.lock_webcam ?? false}
            onChange={(e) => updateLockSettings(e, 'webcam')}
            className={`${
              roomLockSettings?.lock_webcam ? 'bg-blue-600' : 'bg-gray-200'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            <span
              className={`${
                roomLockSettings?.lock_webcam
                  ? 'translate-x-6'
                  : 'translate-x-1'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>

        <div className="flex items-center mb-4">
          <Switch.Label className="pr-4 w-full max-w-[300px]">
            {t('footer.modal.lock-screen-sharing')}
          </Switch.Label>
          <Switch
            checked={roomLockSettings?.lock_screen_sharing ?? false}
            onChange={(e) => updateLockSettings(e, 'screenShare')}
            className={`${
              roomLockSettings?.lock_screen_sharing
                ? 'bg-blue-600'
                : 'bg-gray-200'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            <span
              className={`${
                roomLockSettings?.lock_screen_sharing
                  ? 'translate-x-6'
                  : 'translate-x-1'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>

        <div className="flex items-center mb-4">
          <Switch.Label className="pr-4 w-full max-w-[300px]">
            {t('footer.modal.lock-chat')}
          </Switch.Label>
          <Switch
            checked={roomLockSettings?.lock_chat ?? false}
            onChange={(e) => updateLockSettings(e, 'chat')}
            className={`${
              roomLockSettings?.lock_chat ? 'bg-blue-600' : 'bg-gray-200'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            <span
              className={`${
                roomLockSettings?.lock_chat ? 'translate-x-6' : 'translate-x-1'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>

        <div className="flex items-center mb-4">
          <Switch.Label className="pr-4 w-full max-w-[300px]">
            {t('footer.modal.lock-send-message')}
          </Switch.Label>
          <Switch
            checked={roomLockSettings?.lock_chat_send_message ?? false}
            onChange={(e) => updateLockSettings(e, 'sendChatMsg')}
            className={`${
              roomLockSettings?.lock_chat_send_message
                ? 'bg-blue-600'
                : 'bg-gray-200'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            <span
              className={`${
                roomLockSettings?.lock_chat_send_message
                  ? 'translate-x-6'
                  : 'translate-x-1'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>

        <div className="flex items-center mb-4">
          <Switch.Label className="pr-4 w-full max-w-[300px]">
            {t('footer.modal.lock-chat-file-share')}
          </Switch.Label>
          <Switch
            checked={roomLockSettings?.lock_chat_file_share ?? false}
            onChange={(e) => updateLockSettings(e, 'chatFile')}
            className={`${
              roomLockSettings?.lock_chat_file_share
                ? 'bg-blue-600'
                : 'bg-gray-200'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            <span
              className={`${
                roomLockSettings?.lock_chat_file_share
                  ? 'translate-x-6'
                  : 'translate-x-1'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>
      </Switch.Group>
    );
  };

  const render = () => {
    return (
      <>
        <Transition appear show={true} as={Fragment}>
          <Dialog
            as="div"
            className="fixed inset-0 z-[9999] overflow-y-auto"
            onClose={closeModal}
          >
            <div className="min-h-screen px-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
              </Transition.Child>

              <span
                className="inline-block h-screen align-middle"
                aria-hidden="true"
              >
                &#8203;
              </span>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <div className="inline-block w-full h-96 max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
                  <button
                    className="close-btn absolute top-8 right-6 w-[25px] h-[25px] outline-none"
                    type="button"
                    onClick={() => closeModal()}
                  >
                    <span className="inline-block h-[1px] w-[20px] bg-[#004D90] absolute top-0 left-0 rotate-45" />
                    <span className="inline-block h-[1px] w-[20px] bg-[#004D90] absolute top-0 left-0 -rotate-45" />
                  </button>

                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 mb-2"
                  >
                    {t('footer.modal.lock-settings-title')}
                  </Dialog.Title>
                  <hr />
                  <div className="mt-6">{showLockItems()}</div>
                </div>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>
      </>
    );
  };

  return <>{render()}</>;
};

export default LockSettingsModal;
