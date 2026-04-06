/**
 * Tests for the new-project dialog.
 *
 * @author Khalid Farag, Andrew Bovbel
 * @lastModified 2026/04/05
 */
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
      />,
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
      />,
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
      />,
    );
    await userEvent.click(getByRole('button', { name: /Create Project/ }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        projectName: 'box',
        modelUnits: 'mm',
        voxelSize: 1,
        defaultMaterial: 1,
      }),
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
      />,
    );
    await userEvent.type(getByPlaceholderText('project-suffix'), 'v1');
    await userEvent.click(getByRole('button', { name: /Create Project/ }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        projectName: 'box-v1',
        modelUnits: 'mm',
        voxelSize: 1,
        defaultMaterial: 1,
      }),
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
      />,
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
      />,
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
      />,
    );
    const input = getByPlaceholderText('project-suffix');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows alert when voxel size invalid and form submitted', async () => {
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const onConfirm = jest.fn();
    const { getByRole } = render(
      <NewProjectDialog
        isOpen
        stlFileName="box.stl"
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );
    const voxelInput = document.getElementById('voxel-size-input');
    if (voxelInput) {
      fireEvent.change(voxelInput, { target: { value: '0' } });
    }
    await userEvent.click(getByRole('button', { name: /Create Project/ }));
    expect(alertMock).toHaveBeenCalledWith(
      'Please enter a valid voxel size (> 0).',
    );
    expect(onConfirm).not.toHaveBeenCalled();
    alertMock.mockRestore();
  });

  it('shows validation message when voxel size invalid', () => {
    const { getByText } = render(
      <NewProjectDialog
        isOpen
        stlFileName="x.stl"
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    const voxelInput = document.getElementById('voxel-size-input');
    if (voxelInput) {
      fireEvent.change(voxelInput, { target: { value: '0' } });
    }
    expect(
      getByText(/Voxel size must be a number greater than 0/i),
    ).toBeInTheDocument();
  });

  it('can change model units and voxel units', async () => {
    const onConfirm = jest.fn();
    const { getByRole, container } = render(
      <NewProjectDialog
        isOpen
        stlFileName="box.stl"
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );
    const modelCm = container.querySelector<HTMLInputElement>(
      'input[name="modelUnits"][value="cm"]',
    );
    if (modelCm) await userEvent.click(modelCm);
    await userEvent.click(getByRole('button', { name: /Create Project/ }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        modelUnits: 'cm',
      }),
    );
  });

  it('add material flow: assigns next material ID and submits', async () => {
    const onConfirm = jest.fn();
    const { getByRole } = render(
      <NewProjectDialog
        isOpen
        stlFileName="box.stl"
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );
    const materialSelect = document.getElementById('material-select');
    if (materialSelect) {
      fireEvent.change(materialSelect, {
        target: { value: '__ADD_NEW_MATERIAL__' },
      });
    }
    await userEvent.click(getByRole('button', { name: /Add ID 4/ }));
    await userEvent.click(getByRole('button', { name: /Create Project/ }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultMaterial: 4,
      }),
    );
  });

  it('add material flow: Cancel restores previous selection', async () => {
    const { container } = render(
      <NewProjectDialog
        isOpen
        stlFileName="box.stl"
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    const materialSelect = document.getElementById('material-select');
    if (materialSelect) {
      fireEvent.change(materialSelect, {
        target: { value: '__ADD_NEW_MATERIAL__' },
      });
    }
    const cancelInPanel = container.querySelector(
      '.add-material-actions button.dialog-button-small',
    );
    if (cancelInPanel) await userEvent.click(cancelInPanel as HTMLElement);
    expect(
      (document.getElementById('material-select') as HTMLSelectElement)?.value,
    ).toBe('1');
  });

  it('voxel size input allows decimal', () => {
    render(
      <NewProjectDialog
        isOpen
        stlFileName="x.stl"
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    const voxelInput = document.getElementById(
      'voxel-size-input',
    ) as HTMLInputElement;
    fireEvent.change(voxelInput, { target: { value: '1.5' } });
    expect(voxelInput.value).toBe('1.5');
  });

  it('add material panel shows next ID before confirming', async () => {
    const { getByText } = render(
      <NewProjectDialog
        isOpen
        stlFileName="box.stl"
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    const materialSelect = document.getElementById('material-select');
    if (materialSelect) {
      fireEvent.change(materialSelect, {
        target: { value: '__ADD_NEW_MATERIAL__' },
      });
    }
    expect(getByText(/material ID 4/i)).toBeInTheDocument();
  });

  it('voxel size allows empty string', () => {
    render(
      <NewProjectDialog
        isOpen
        stlFileName="x.stl"
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    const voxelInput = document.getElementById(
      'voxel-size-input',
    ) as HTMLInputElement;
    fireEvent.change(voxelInput, { target: { value: '' } });
    expect(voxelInput.value).toBe('');
  });

  it('second add uses next sequential material ID', async () => {
    const onConfirm = jest.fn();
    const { getByRole } = render(
      <NewProjectDialog
        isOpen
        stlFileName="box.stl"
        initialMaterialIds={[1, 2]}
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );
    let materialSelect = document.getElementById('material-select');
    if (materialSelect) {
      fireEvent.change(materialSelect, {
        target: { value: '__ADD_NEW_MATERIAL__' },
      });
    }
    await userEvent.click(getByRole('button', { name: /Add ID 3/ }));
    materialSelect = document.getElementById('material-select');
    if (materialSelect) {
      fireEvent.change(materialSelect, {
        target: { value: '__ADD_NEW_MATERIAL__' },
      });
    }
    await userEvent.click(getByRole('button', { name: /Add ID 4/ }));
    await userEvent.click(getByRole('button', { name: /Create Project/ }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultMaterial: 4,
      }),
    );
  });
});
