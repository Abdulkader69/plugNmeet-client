import React from 'react';

import './style.css';

interface ILoadingProps {
  text: string;
}
const Loading = ({ text }: ILoadingProps) => {
  return (
    <div
      className={`loader opacity-1 fixed top-0 left-0 w-full h-full bg-white/90 z-[999] flex flex-wrap items-center justify-center`}
    >
      <div className="inner">
        <div className="lds-ripple">
          <div></div>
          <div></div>
        </div>
        <p className="block w-full text-center relative bottom-4 capitalize">
          {text}
        </p>
      </div>
    </div>
  );
};

export default Loading;
