import { render, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuBar } from './MenuBar';

describe('MenuBar', () => {
  it('renders menu names', () => {
    const { getByRole } = render(<MenuBar />);
    expect(getByRole('button', { name: 'File' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Help' })).toBeInTheDocument();
  });

  it('opens dropdown when menu clicked', async () => {
    const { getByRole, getByText } = render(<MenuBar />);
    await userEvent.click(getByRole('button', { name: 'File' }));
    expect(getByText('Open File...')).toBeInTheDocument();
    expect(getByText('Upload File...')).toBeInTheDocument();
  });

  it('calls onUploadFile when Upload File clicked', async () => {
    const onUploadFile = jest.fn();
    const { getByRole, getByText } = render(
      <MenuBar onUploadFile={onUploadFile} />,
    );
    await userEvent.click(getByRole('button', { name: 'File' }));
    await userEvent.click(getByText('Upload File...'));
    expect(onUploadFile).toHaveBeenCalled();
  });

  it('calls onOpenFileSelect when model selected from Open File submenu', async () => {
    const onOpenFileSelect = jest.fn();
    const { getByRole, getByText, findByRole } = render(
      <MenuBar
        onOpenFileSelect={onOpenFileSelect}
        availableModels={['cube.stl', 'box.stl']}
      />,
    );
    await userEvent.click(getByRole('button', { name: 'File' }));
    await userEvent.hover(getByText('Open File...'));
    const cubeBtn = await findByRole('button', { name: 'cube.stl' });
    await userEvent.click(cubeBtn);
    expect(onOpenFileSelect).toHaveBeenCalledWith('cube.stl');
  });

  it('calls onNewProject when New Project clicked in Open Project submenu', async () => {
    const onNewProject = jest.fn();
    const { getByRole, getByText, findByRole } = render(
      <MenuBar
        onNewProject={onNewProject}
        onOpenProjectSelect={jest.fn()}
        availableProjects={[]}
        selectedModel="x.stl"
      />,
    );
    await userEvent.click(getByRole('button', { name: 'File' }));
    await userEvent.hover(getByText('Open Project...'));
    const newProjBtn = await findByRole('button', { name: 'New Project...' });
    await userEvent.click(newProjBtn);
    expect(onNewProject).toHaveBeenCalled();
  });

  it('calls onOpenProjectSelect when project selected', async () => {
    const onOpenProjectSelect = jest.fn();
    const { getByRole, getByText, findByRole } = render(
      <MenuBar
        onOpenProjectSelect={onOpenProjectSelect}
        availableProjects={['proj1']}
      />,
    );
    await userEvent.click(getByRole('button', { name: 'File' }));
    await userEvent.hover(getByText('Open Project...'));
    const projBtn = await findByRole('button', { name: 'proj1' });
    await userEvent.click(projBtn);
    expect(onOpenProjectSelect).toHaveBeenCalledWith('proj1');
  });

  it('calls handleOpenFileLeave when leaving Open File area', async () => {
    const { getByRole, getByText } = render(
      <MenuBar availableModels={['a.stl']} />,
    );
    await userEvent.click(getByRole('button', { name: 'File' }));
    await userEvent.hover(getByText('Open File...'));
    const openFileEl = getByText('Open File...');
    fireEvent.mouseLeave(openFileEl);
    expect(getByRole('button', { name: 'File' })).toBeInTheDocument();
  });

  it('opens Open Project submenu when hover with projects', async () => {
    const { getByRole, getByText, findByRole } = render(
      <MenuBar availableProjects={['p1']} />,
    );
    await userEvent.click(getByRole('button', { name: 'File' }));
    await userEvent.hover(getByText('Open Project...'));
    const p1Btn = await findByRole('button', { name: 'p1' });
    expect(p1Btn).toBeInTheDocument();
  });

  it('handleOpenProjectLeave closes submenu on mouse leave', async () => {
    const { getByRole, getByText } = render(
      <MenuBar availableProjects={['p1']} />,
    );
    await userEvent.click(getByRole('button', { name: 'File' }));
    await userEvent.hover(getByText('Open Project...'));
    fireEvent.mouseLeave(getByText('Open Project...'));
    expect(getByRole('button', { name: 'File' })).toBeInTheDocument();
  });
});
