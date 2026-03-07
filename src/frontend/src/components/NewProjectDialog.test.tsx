import { render, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewProjectDialog } from './NewProjectDialog';

describe('NewProjectDialog', () => {
  it('returns null when not open', () => {
    const { container } = render(
      <NewProjectDialog
        isOpen={false}
        stlFileName="model.stl"
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog when open with locked prefix', () => {
    const { getByText, getByPlaceholderText, getByRole } = render(
      <NewProjectDialog
        isOpen
        stlFileName="box.stl"
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />
    );
    expect(getByText('New Project')).toBeInTheDocument();
    expect(getByText('box-')).toBeInTheDocument();
    expect(getByPlaceholderText('project-suffix')).toBeInTheDocument();
    expect(getByRole('button', { name: /Create Project/ })).toBeInTheDocument();
  });

  it('calls onConfirm with base name when suffix empty and form submitted', async () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    const { getByRole } = render(
      <NewProjectDialog
        isOpen
        stlFileName="box.stl"
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );
    await userEvent.click(getByRole('button', { name: /Create Project/ }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        projectName: 'box',
        modelUnits: 'mm',
        voxelSize: 1,
        voxelUnits: 'mm',
        defaultMaterial: 'material1',
      })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onConfirm with base-suffix when suffix provided', async () => {
    const onConfirm = jest.fn();
    const { getByPlaceholderText, getByRole } = render(
      <NewProjectDialog
        isOpen
        stlFileName="box.stl"
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />
    );
    await userEvent.type(getByPlaceholderText('project-suffix'), 'v1');
    await userEvent.click(getByRole('button', { name: /Create Project/ }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        projectName: 'box-v1',
        modelUnits: 'mm',
        voxelSize: 1,
        voxelUnits: 'mm',
        defaultMaterial: 'material1',
      })
    );
  });

  it('calls onClose when Cancel clicked', async () => {
    const onClose = jest.fn();
    const { getByRole } = render(
      <NewProjectDialog
        isOpen
        stlFileName="x.stl"
        onClose={onClose}
        onConfirm={jest.fn()}
      />
    );
    await userEvent.click(getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when overlay clicked', async () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <NewProjectDialog
        isOpen
        stlFileName="x.stl"
        onClose={onClose}
        onConfirm={jest.fn()}
      />
    );
    const overlay = getByText('New Project').closest('.dialog-overlay');
    await userEvent.click(overlay!);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape pressed', () => {
    const onClose = jest.fn();
    const { getByPlaceholderText } = render(
      <NewProjectDialog
        isOpen
        stlFileName="x.stl"
        onClose={onClose}
        onConfirm={jest.fn()}
      />
    );
    const input = getByPlaceholderText('project-suffix');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
