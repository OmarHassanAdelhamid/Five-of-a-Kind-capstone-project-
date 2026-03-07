import { render } from '@testing-library/react';
import { Footer } from './Footer';

describe('Footer', () => {
  it('renders API URL, models count, and selected model', () => {
    const { getByText } = render(<Footer modelsCount={3} selectedModel="cube.stl" />);
    expect(getByText(/Backend API:/)).toBeInTheDocument();
    expect(getByText('3')).toBeInTheDocument();
    expect(getByText('cube.stl')).toBeInTheDocument();
  });

  it('shows None when selectedModel is null', () => {
    const { getByText } = render(<Footer modelsCount={0} selectedModel={null} />);
    expect(getByText('None')).toBeInTheDocument();
  });
});
