import { Content } from '@/contents/index/CleanIntuitive';
import { useEffect, useState } from 'react';
import useScreenSize from './useScreenSize';

export const useAnimateContent = (content: Array<Content>) => {
  const [currentState, setCurrentState] = useState<Content>(content[0]);
  const [isUserClick, setIsUserClick] = useState(false);
  const screenSize = useScreenSize();

  useEffect(() => {
    let animateState: NodeJS.Timer;
    let timeOutState: NodeJS.Timeout;
    // if (screenSize < 1024) {
    //   return () => {
    //     clearInterval(animateState);
    //     clearTimeout(timeOutState);
    //   };
    // }

    if (isUserClick) {
      timeOutState = setTimeout(() => {
        animateState = setInterval(() => {
          setCurrentState((prev) => {
            return content[
              content.indexOf(prev) < content.length - 1
                ? content.indexOf(prev) + 1
                : 0
            ];
          });
        }, 1000);

        setIsUserClick(false);
      }, 5000);
    } else {
      animateState = setInterval(() => {
        //Make animation to change current state
        setCurrentState((prev) => {
          return content[
            content.indexOf(prev) < content.length - 1
              ? content.indexOf(prev) + 1
              : 0
          ];
        });
      }, 1500);
    }

    return () => {
      clearInterval(animateState);
      clearTimeout(timeOutState);
    };
  }, [isUserClick, currentState]);
  return { setIsUserClick, currentState, setCurrentState };
};
