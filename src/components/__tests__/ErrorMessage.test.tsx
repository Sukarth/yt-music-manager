import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import ErrorMessage from '../common/ErrorMessage';

const renderWithProvider = (component: React.ReactElement) => {
  return render(<PaperProvider>{component}</PaperProvider>);
};

describe('ErrorMessage', () => {
  it('should render error message', () => {
    const { getByText } = renderWithProvider(<ErrorMessage message="Something went wrong" />);

    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('should render retry button when onRetry is provided', () => {
    const mockOnRetry = jest.fn();

    const { getByText } = renderWithProvider(
      <ErrorMessage message="Error occurred" onRetry={mockOnRetry} />
    );

    expect(getByText('Retry')).toBeTruthy();
  });

  it('should call onRetry when retry button is pressed', () => {
    const mockOnRetry = jest.fn();

    const { getByText } = renderWithProvider(
      <ErrorMessage message="Error occurred" onRetry={mockOnRetry} />
    );

    fireEvent.press(getByText('Retry'));
    expect(mockOnRetry).toHaveBeenCalled();
  });

  it('should not render retry button when onRetry is not provided', () => {
    const { queryByText } = renderWithProvider(<ErrorMessage message="Error occurred" />);

    expect(queryByText('Retry')).toBeNull();
  });

  it('should render different error messages', () => {
    const { getByText } = renderWithProvider(
      <ErrorMessage message="Network error: Please check your connection" />
    );

    expect(getByText('Network error: Please check your connection')).toBeTruthy();
  });
});
