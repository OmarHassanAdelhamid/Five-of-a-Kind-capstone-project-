import { render } from '@testing-library/react';
import { Footer } from './Footer';

describe('Footer', () => {
  it('shows only the Ctrl/Cmd+Click hint when there are no voxels', () => {
    const { queryByText } = render(<Footer hasVoxels={false} />);
    expect(queryByText(/Click/)).toBeInTheDocument();
    expect(queryByText(/select layer/)).not.toBeInTheDocument();
  });

  it('shows the Click to select layer hint when voxels are present', () => {
    const { getByText } = render(<Footer hasVoxels={true} />);
    expect(getByText(/select layer/)).toBeInTheDocument();
  });
});
