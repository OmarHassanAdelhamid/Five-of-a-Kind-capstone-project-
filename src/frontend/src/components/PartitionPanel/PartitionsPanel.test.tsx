import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PartitionsPanel } from '../../components/PartitionPanel/PartitionsPanel';
import * as api from '../../utils/api';

jest.mock('../../utils/api', () => ({
  fetchPartitions: jest.fn(),
  renamePartition: jest.fn(),
}));

const mockFetchPartitions = api.fetchPartitions as jest.MockedFunction<
  typeof api.fetchPartitions
>;

describe('PartitionsPanel', () => {
  beforeEach(() => {
    mockFetchPartitions.mockReset();
  });

  it('returns null when not open', () => {
    const { container } = render(
      <PartitionsPanel
        isOpen={false}
        projectName="proj"
        selectedPartition={null}
        onPartitionSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows select project message when no projectName', () => {
    const { getByText } = render(
      <PartitionsPanel
        isOpen
        projectName={null}
        selectedPartition={null}
        onPartitionSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(
      getByText('Select a project to view partitions'),
    ).toBeInTheDocument();
    expect(mockFetchPartitions).not.toHaveBeenCalled();
  });

  it('fetches and shows partitions when open and projectName set', async () => {
    mockFetchPartitions.mockResolvedValue(['default', 'part1']);
    const { getByText, findByText } = render(
      <PartitionsPanel
        isOpen
        projectName="myproj"
        selectedPartition={null}
        onPartitionSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(mockFetchPartitions).toHaveBeenCalledWith('myproj');
    expect(await findByText('default')).toBeInTheDocument();
    expect(getByText('part1')).toBeInTheDocument();
  });

  it('calls onPartitionSelect when partition clicked', async () => {
    mockFetchPartitions.mockResolvedValue(['default']);
    const onPartitionSelect = jest.fn();
    const { findByText } = render(
      <PartitionsPanel
        isOpen
        projectName="p"
        selectedPartition={null}
        onPartitionSelect={onPartitionSelect}
        onClose={jest.fn()}
      />,
    );
    const btn = await findByText('default');
    await userEvent.click(btn);
    expect(onPartitionSelect).toHaveBeenCalledWith('default');
  });

  it('calls onClose when close button clicked', async () => {
    mockFetchPartitions.mockResolvedValue([]);
    const onClose = jest.fn();
    const { getByTitle } = render(
      <PartitionsPanel
        isOpen
        projectName="p"
        selectedPartition={null}
        onPartitionSelect={jest.fn()}
        onClose={onClose}
      />,
    );
    await userEvent.click(getByTitle('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows error when fetch fails', async () => {
    mockFetchPartitions.mockRejectedValue(new Error('Network error'));
    const { findByText } = render(
      <PartitionsPanel
        isOpen
        projectName="p"
        selectedPartition={null}
        onPartitionSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(await findByText('Network error')).toBeInTheDocument();
  });

  it('shows selected partition with selected class', async () => {
    mockFetchPartitions.mockResolvedValue(['default', 'part1']);
    const { findByText } = render(
      <PartitionsPanel
        isOpen
        projectName="p"
        selectedPartition="part1"
        onPartitionSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    const part1Btn = await findByText('part1');
    expect(part1Btn.className).toContain('selected');
  });

  it('shows loading then no partitions message when fetch returns empty', async () => {
    mockFetchPartitions.mockResolvedValue([]);
    const { findByText } = render(
      <PartitionsPanel
        isOpen
        projectName="p"
        selectedPartition={null}
        onPartitionSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(await findByText('No partitions found')).toBeInTheDocument();
  });
});
