import clsx from 'clsx';
import { m, useAnimationControls } from 'framer-motion';
import Image from 'next/image';

function HeaderImage() {
  return (
    <div className={clsx('relative h-[590px] w-[603px]')}>
      <div
        className={clsx(
          'from-accent-400/20 via-accent-400/0 absolute right-0 top-0 h-[590px] w-[375px] rounded-full bg-gradient-to-t',
          'dark:from-accent-600/10 dark:via-accent-600/0'
        )}
      >
        <div
          className={clsx(
            'absolute right-0 top-0 translate-y-1/3 transform overflow-hidden'
          )}
        >
          <m.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Image
              alt="Tio Ramadhan Illustration"
              src="/assets/images/me.jpeg"
              width={457 - 50}
              height={526 - 50}
              className={clsx(
                'rounded-full',
                'hidden max-w-none',
                'lg:block',
                'dark:brightness-[.82]'
              )}
              quality={100}
              priority
            />
          </m.div>
        </div>
      </div>
    </div>
  );
}

export default HeaderImage;
