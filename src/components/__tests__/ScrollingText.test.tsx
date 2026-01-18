import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View } from 'react-native';
import { ScrollingText } from '../common/ScrollingText';

describe('ScrollingText', () => {
  it('should render text', () => {
    const { getByText } = render(<ScrollingText text="Hello World" />);

    expect(getByText('Hello World')).toBeTruthy();
  });

  it('should handle layout updates without crashing', () => {
    const { getByText, UNSAFE_getAllByType } = render(
      <ScrollingText text="Scrolling" speed={60} delay={500} />
    );

    const containers = UNSAFE_getAllByType(View);
    const container = containers[0];

    fireEvent(container, 'layout', { nativeEvent: { layout: { width: 100 } } });
    fireEvent(getByText('Scrolling'), 'layout', { nativeEvent: { layout: { width: 200 } } });

    expect(getByText('Scrolling')).toBeTruthy();
  });
});
