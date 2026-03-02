import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UploadButton } from './UploadButton';

describe('UploadButton', () => {
  it('calls onUpload with file when .stl file selected', async () => {
    const onUpload = jest.fn();
    render(<UploadButton uploadState="idle" onUpload={onUpload} />);
    const input = document.getElementById('stl-upload-input') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    const file = new File(['stl'], 'model.stl', { type: 'application/octet-stream' });
    await userEvent.upload(input, file);
    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it('does not call onUpload for non-.stl file', async () => {
    const onUpload = jest.fn();
    render(<UploadButton uploadState="idle" onUpload={onUpload} />);
    const input = document.getElementById('stl-upload-input') as HTMLInputElement;
    const file = new File(['x'], 'model.txt', { type: 'text/plain' });
    await userEvent.upload(input, file);
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('does not call onUpload when file name is .STL (uppercase)', async () => {
    const onUpload = jest.fn();
    render(<UploadButton uploadState="idle" onUpload={onUpload} />);
    const input = document.getElementById('stl-upload-input') as HTMLInputElement;
    const file = new File(['x'], 'model.STL', { type: 'application/octet-stream' });
    await userEvent.upload(input, file);
    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it('shows Uploading… when uploading', () => {
    const { getByText } = render(<UploadButton uploadState="uploading" onUpload={jest.fn()} />);
    expect(getByText('Uploading…')).toBeInTheDocument();
  });

  it('disables input when uploading', () => {
    render(<UploadButton uploadState="uploading" onUpload={jest.fn()} />);
    expect((document.getElementById('stl-upload-input') as HTMLInputElement).disabled).toBe(true);
  });

  it('shows Upload STL File when idle', () => {
    const { getByText } = render(<UploadButton uploadState="idle" onUpload={jest.fn()} />);
    expect(getByText('Upload STL File')).toBeInTheDocument();
  });

  it('accepts only .stl files', () => {
    render(<UploadButton uploadState="idle" onUpload={jest.fn()} />);
    const input = document.getElementById('stl-upload-input') as HTMLInputElement;
    expect(input.getAttribute('accept')).toBe('.stl');
  });

  it('does not call onUpload when no file selected', () => {
    const onUpload = jest.fn();
    render(<UploadButton uploadState="idle" onUpload={onUpload} />);
    const input = document.getElementById('stl-upload-input') as HTMLInputElement;
    const ev = new Event('change', { bubbles: true });
    Object.defineProperty(ev, 'target', {
      value: { files: [], value: '' },
      writable: false,
    });
    input.dispatchEvent(ev);
    expect(onUpload).not.toHaveBeenCalled();
  });
});
