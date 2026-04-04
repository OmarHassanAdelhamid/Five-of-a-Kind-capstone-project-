import { render } from '@testing-library/react';
import { StatusMessage } from './StatusMessage';

describe('StatusMessage', () => {
  it('returns null when status is ready', () => {
    const { container } = render(
      <StatusMessage status="ready" selectedModel="x.stl" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows loading message with selected model', () => {
    const { getByText } = render(<StatusMessage status="loading" selectedModel="cube.stl" />);
    expect(getByText('Loading cube.stl…')).toBeInTheDocument();
  });

  it('shows loading project when no selected model', () => {
    const { getByText } = render(<StatusMessage status="loading" />);
    expect(getByText('Loading project…')).toBeInTheDocument();
  });

  it('shows error message when status is error', () => {
    const { getByText } = render(<StatusMessage status="error" message="Something failed" />);
    expect(getByText('Something failed')).toBeInTheDocument();
  });

  it('has status class on container', () => {
    const { getByText } = render(<StatusMessage status="error" message="err" />);
    const el = getByText('err').closest('.status');
    expect(el).toHaveClass('error');
  });
});
