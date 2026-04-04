import { render } from '@testing-library/react';
import { UploadMessage } from './UploadMessage';

describe('UploadMessage', () => {
  it('returns null when message is null', () => {
    const { container } = render(
      <UploadMessage uploadState="idle" message={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders message with upload state class', () => {
    const { getByText } = render(
      <UploadMessage uploadState="success" message="File uploaded!" />
    );
    const p = getByText('File uploaded!');
    expect(p).toHaveClass('upload-message', 'success');
  });
});
