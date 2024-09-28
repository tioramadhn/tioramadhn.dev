import clsx from 'clsx';
import { useEffect, useState } from 'react';

import { SectionButton } from '@/components/sections/SectionButton';
import SectionContent from '@/components/sections/SectionContent';
import SectionTitle from '@/components/sections/SectionTitle';

import TodoItem from '@/contents/index/Cards/TodoItem';

import type { TodoItemState } from '@/contents/index/Cards/TodoItem';
import { useAnimateContent } from '@/hooks/useAnimateContent';

export type Content = {
  state: TodoItemState;
  shows: Array<TodoItemState>;
  title: string;
  description: string;
};

const content: Array<Content> = [
  {
    state: 'typography',
    shows: ['typography'],
    title: 'Typography',
    description: 'Selecting the font type, font size, and font weight.',
  },
  {
    state: 'spacing',
    shows: ['typography', 'spacing'],
    title: 'Spacing',
    description: 'Positioning and adding spacing between elements.',
  },
  {
    state: 'colors',
    shows: ['typography', 'spacing', 'colors'],
    title: 'Colors',
    description: 'Choosing a color scheme with sufficient contrast.',
  },
  {
    state: 'effects',
    shows: ['typography', 'spacing', 'colors', 'effects'],
    title: 'Effects',
    description: 'Add effects like borders, shadows, rounded corners, etc.',
  },
];

function CleanIntuitive() {
  const { currentState, setCurrentState, setIsUserClick } =
    useAnimateContent(content);
  return (
    <>
      <header className={clsx('mb-4')}>
        <SectionTitle
          title="Eye Catching, Modern & Minimalist Design."
          caption="Clean & Intuitive"
          description="Keep the User Interface clean with a modern touch without
            compromising the User Experience."
        />
      </header>
      <SectionContent>
        <div className={clsx('flex flex-col gap-8 lg:flex-row', 'lg:gap-12')}>
          <div
            className={clsx(
              '-mt-8 flex flex-1 flex-row gap-1 lg:flex-col lg:gap-3',
              'lg:flex'
            )}
          >
            {content.map((item, i) => (
              <SectionButton
                key={item.state}
                title={item.title}
                description={item.description}
                icon={i + 1}
                active={currentState?.state === item.state}
                onClick={() => {
                  setCurrentState(item);
                  setIsUserClick(true);
                }}
              />
            ))}
          </div>
          <p className="text-center lg:hidden">{currentState?.description}</p>
          <div
            className={clsx('relative flex flex-1 items-center justify-center')}
          >
            <div
              className={clsx('mt-0 flex gap-4', 'md:gap-6 lg:top-8 lg:mt-0')}
            >
              <div>
                <TodoItem
                  state={
                    currentState
                      ? currentState.shows
                      : ['typography', 'spacing', 'colors', 'effects']
                  }
                />
              </div>
              <div className={clsx('hidden', 'sm:block lg:hidden')}>
                <TodoItem
                  state={
                    currentState
                      ? currentState.shows
                      : ['typography', 'spacing', 'colors', 'effects']
                  }
                  title="UI Implementation"
                  description="Start creating UI components using React and Tailwind CSS."
                  date="10:00 AM · Tomorrow"
                  tag1="Design"
                  tag2="Components"
                />
              </div>
            </div>
          </div>
        </div>
      </SectionContent>
    </>
  );
}

export default CleanIntuitive;
