import React from 'react';
import { render } from '@testing-library/react-native';
import LoadingSpinner from '../common/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render without message', () => {
    const { queryByText } = render(<LoadingSpinner />);
    expect(queryByText(/./)).toBeNull();
  });

  it('should render with message', () => {
    const { getByText } = render(<LoadingSpinner message="Loading..." />);
    expect(getByText('Loading...')).toBeTruthy();
  });
});
