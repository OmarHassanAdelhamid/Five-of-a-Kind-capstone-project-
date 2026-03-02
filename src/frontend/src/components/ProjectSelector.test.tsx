import { render, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectSelector } from './ProjectSelector';

describe('ProjectSelector', () => {
  it('renders select when projects available', () => {
    const { getByRole, getByText } = render(
      <ProjectSelector
        availableProjects={['proj1', 'proj2']}
        projectName="proj1"
        onProjectNameChange={jest.fn()}
        onLoadVoxels={jest.fn()}
      />
    );
    expect(getByRole('combobox')).toHaveValue('proj1');
    expect(getByText('Load Voxels')).toBeInTheDocument();
  });

  it('renders text input when no projects', () => {
    const { getByPlaceholderText } = render(
      <ProjectSelector
        availableProjects={[]}
        projectName=""
        onProjectNameChange={jest.fn()}
        onLoadVoxels={jest.fn()}
      />
    );
    expect(getByPlaceholderText('Enter project name')).toBeInTheDocument();
  });

  it('calls onLoadVoxels when Load Voxels clicked', async () => {
    const onLoadVoxels = jest.fn();
    const { getByText } = render(
      <ProjectSelector
        availableProjects={['p1']}
        projectName="p1"
        onProjectNameChange={jest.fn()}
        onLoadVoxels={onLoadVoxels}
      />
    );
    await userEvent.click(getByText('Load Voxels'));
    expect(onLoadVoxels).toHaveBeenCalled();
  });

  it('Load Voxels disabled when projectName empty', () => {
    const { getByText } = render(
      <ProjectSelector
        availableProjects={[]}
        projectName=""
        onProjectNameChange={jest.fn()}
        onLoadVoxels={jest.fn()}
      />
    );
    expect(getByText('Load Voxels').closest('button')).toBeDisabled();
  });

  it('shows voxel count when provided', () => {
    const { getByText } = render(
      <ProjectSelector
        availableProjects={[]}
        projectName="p"
        onProjectNameChange={jest.fn()}
        onLoadVoxels={jest.fn()}
        voxelCount={100}
      />
    );
    expect(getByText('Loaded 100 voxel coordinates')).toBeInTheDocument();
  });

  it('calls onProjectNameChange when typing in text input', async () => {
    const onProjectNameChange = jest.fn();
    const { getByPlaceholderText } = render(
      <ProjectSelector
        availableProjects={[]}
        projectName=""
        onProjectNameChange={onProjectNameChange}
        onLoadVoxels={jest.fn()}
      />
    );
    await userEvent.type(getByPlaceholderText('Enter project name'), 'myproj');
    expect(onProjectNameChange).toHaveBeenCalled();
  });

  it('calls onProjectNameChange when selecting from dropdown', async () => {
    const onProjectNameChange = jest.fn();
    const { getByRole } = render(
      <ProjectSelector
        availableProjects={['p1', 'p2']}
        projectName="p1"
        onProjectNameChange={onProjectNameChange}
        onLoadVoxels={jest.fn()}
      />
    );
    await userEvent.selectOptions(getByRole('combobox'), 'p2');
    expect(onProjectNameChange).toHaveBeenCalledWith('p2');
  });

  it('calls onLoadVoxels when Enter pressed in project name input', () => {
    const onLoadVoxels = jest.fn();
    const { getByPlaceholderText } = render(
      <ProjectSelector
        availableProjects={[]}
        projectName=""
        onProjectNameChange={jest.fn()}
        onLoadVoxels={onLoadVoxels}
      />
    );
    const input = getByPlaceholderText('Enter project name');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onLoadVoxels).toHaveBeenCalled();
  });
});
